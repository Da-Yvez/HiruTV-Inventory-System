import { adminAuth } from '@/lib/firebaseAdmin';
import { adminDb } from '@/lib/firebaseAdmin';

async function requireAdmin(request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) throw new Error('UNAUTHORIZED');
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists || userDoc.data().isAdmin !== true) throw new Error('FORBIDDEN');
    return decoded;
}

const unauthorized = () => Response.json({ error: 'Unauthorized' }, { status: 401 });
const forbidden = () => Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

// POST /api/users/[uid]/reset-password — sends a password reset email
export async function POST(request, { params }) {
    try {
        await requireAdmin(request);
    } catch (e) {
        return e.message === 'FORBIDDEN' ? forbidden() : unauthorized();
    }

    const { uid } = await params;
    const { password, forcePasswordChange = true } = await request.json();

    if (!password || password.length < 6) {
        return Response.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    try {
        // 1. Update the password in Firebase Auth
        await adminAuth.updateUser(uid, {
            password: password
        });

        // 2. Mark for forced change on next login in Firestore (if requested)
        await adminDb.collection('users').doc(uid).update({
            forcePasswordChange: forcePasswordChange
        });

        // 3. Log the action
        const targetDoc = await adminDb.collection('users').doc(uid).get();
        const targetData = targetDoc.data();
        const { FieldValue } = await import('firebase-admin/firestore');
        const caller = await requireAdmin(request); // We need the caller's email
        
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
