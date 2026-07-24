import { adminAuth } from '@/lib/firebaseAdmin';
import { adminDb } from '@/lib/firebaseAdmin';

async function requireAdmin(request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) throw new Error('UNAUTHORIZED');
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists) throw new Error('FORBIDDEN');
    const userData = userDoc.data();
    if (!userData.isAdmin && !userData.isSuperAdmin) throw new Error('FORBIDDEN');
    return { ...decoded, ...userData };
}

const unauthorized = () => Response.json({ error: 'Unauthorized' }, { status: 401 });
const forbidden = () => Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

// POST /api/users/[uid]/reset-password — sends a password reset email
export async function POST(request, { params }) {
    let caller;
    try {
        caller = await requireAdmin(request);
    } catch (e) {
        return e.message === 'FORBIDDEN' ? forbidden() : unauthorized();
    }

    const { uid } = await params;
    const { password, forcePasswordChange = true } = await request.json();

    if (!password || password.length < 6) {
        return Response.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    try {
        // Fetch target user
        const targetDoc = await adminDb.collection('users').doc(uid).get();
        if (!targetDoc.exists) return Response.json({ error: 'User not found' }, { status: 404 });
        const targetData = targetDoc.data();

        // SECURITY CHECKS:
        // 1. Admins cannot reset passwords for Super Admins.
        if (!caller.isSuperAdmin && targetData.isSuperAdmin) {
            return Response.json({ error: 'Only Super Admins can reset passwords for other Super Admins' }, { status: 403 });
        }

        // 2. Admins cannot reset passwords for other Admins.
        if (!caller.isSuperAdmin && targetData.isAdmin && caller.uid !== uid) {
            return Response.json({ error: 'Only Super Admins can reset passwords for other Admins' }, { status: 403 });
        }

        // 3. Site Admins can only reset passwords for users belonging to the sites they manage.
        if (!caller.isSuperAdmin && caller.uid !== uid) {
            const managedSites = [];
            if (caller.permissions?.manage_wtc) managedSites.push('wtc');
            if (caller.permissions?.manage_hls) managedSites.push('hls');
            if (caller.permissions?.manage_hlse) managedSites.push('hlse');

            const siteKeys = {
                wtc: ['canAccessWTC', 'wtc_canAdd', 'wtc_canEdit', 'wtc_canDelete', 'manage_wtc'],
                hls: ['canAccessHLS', 'hls_canAdd', 'hls_canEdit', 'hls_canDelete', 'manage_hls'],
                hlse: ['canAccessHLSE', 'hlse_canAdd', 'hlse_canEdit', 'hlse_canDelete', 'hlse_canCreateSIO', 'hlse_canApproveSIO', 'manage_hlse']
            };

            const allowedKeys = new Set();
            managedSites.forEach(site => {
                siteKeys[site]?.forEach(k => allowedKeys.add(k));
            });

            const hasAccess = Array.from(allowedKeys).some(key => targetData.permissions?.[key] === true);
            if (!hasAccess) {
                return Response.json({ error: 'Forbidden — you do not have permission to manage this user' }, { status: 403 });
            }
        }

        // 1. Update the password in Firebase Auth
        await adminAuth.updateUser(uid, {
            password: password
        });

        // 2. Mark for forced change on next login in Firestore (if requested)
        await adminDb.collection('users').doc(uid).update({
            forcePasswordChange: forcePasswordChange
        });

        // 3. Log the action
        const { FieldValue } = await import('firebase-admin/firestore');
        const isViewer = targetData?.email === 'viewer@hirutv.lk';
        
        await adminDb.collection('systemLogs').add({
            action: 'Password Reset',
            details: isViewer 
                ? `Updated credentials for the Public QR Viewer portal`
                : `Manually reset password for: ${targetData?.email || uid}`,
            user: caller.email,
            timestamp: FieldValue.serverTimestamp()
        });

        return Response.json({ success: true });
    } catch (e) {
        console.error('Manual reset failed:', e);
        return Response.json({ error: 'Failed to reset password' }, { status: 500 });
    }
}
