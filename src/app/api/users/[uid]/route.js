import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

async function requireAdmin(request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) throw new Error('UNAUTHORIZED');
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    const userData = userDoc.data();
    if (!userDoc.exists || (!userData.isAdmin && !userData.isSuperAdmin)) throw new Error('FORBIDDEN');
    return { ...decoded, ...userData };
}

const unauthorized = () => Response.json({ error: 'Unauthorized' }, { status: 401 });
const forbidden = () => Response.json({ error: 'Forbidden — administrative access only' }, { status: 403 });

// PATCH /api/users/[uid] — update displayName, isAdmin, or permissions
export async function PATCH(request, { params }) {
    let caller;
    try {
        caller = await requireAdmin(request);
    } catch (e) {
        return e.message === 'FORBIDDEN' ? forbidden() : unauthorized();
    }

    const { uid } = await params;
    const body = await request.json();
    const { displayName, isAdmin, isSuperAdmin, permissions } = body;

    // Fetch target user to check their current role
    const targetDoc = await adminDb.collection('users').doc(uid).get();
    if (!targetDoc.exists) return Response.json({ error: 'User not found' }, { status: 404 });
    const targetData = targetDoc.data();

    // SECURITY CHECKS:
    // 1. Admins cannot modify Super Admins.
    if (!caller.isSuperAdmin && targetData.isSuperAdmin) {
        return Response.json({ error: 'Only Super Admins can modify other Super Admins' }, { status: 403 });
    }

    // 2. Admins cannot modify other Admins (prevent horizontal escalation)
    if (!caller.isSuperAdmin && targetData.isAdmin && caller.uid !== uid) {
        return Response.json({ error: 'Only Super Admins can modify other Admin accounts' }, { status: 403 });
    }

    // 3. Only Super Admin can change isAdmin or isSuperAdmin flags
    if (!caller.isSuperAdmin && (isAdmin !== undefined || isSuperAdmin !== undefined)) {
        return Response.json({ error: 'Only Super Admins can change user roles' }, { status: 403 });
    }

    const firestoreUpdate = {};
    const authUpdate = {};

    if (displayName !== undefined) {
        firestoreUpdate.displayName = displayName;
        authUpdate.displayName = displayName;
    }
    if (isAdmin !== undefined) firestoreUpdate.isAdmin = isAdmin;
    if (isSuperAdmin !== undefined) firestoreUpdate.isSuperAdmin = isSuperAdmin;
    
    if (permissions !== undefined) {
        // PERMISSION VALIDATION for Admins
        if (!caller.isSuperAdmin && caller.isAdmin) {
            const finalPermissions = { ...targetData.permissions, ...permissions };
            
            // Re-apply restrictions: Admins can only change perms for sites they manage
            if (!caller.permissions?.manage_wtc) {
                ['canAccessWTC', 'wtc_canAdd', 'wtc_canEdit', 'wtc_canDelete', 'manage_wtc'].forEach(k => {
                    finalPermissions[k] = targetData.permissions?.[k] ?? false;
                });
            }
            if (!caller.permissions?.manage_hls) {
                ['canAccessHLS', 'hls_canAdd', 'hls_canEdit', 'hls_canDelete', 'manage_hls'].forEach(k => {
                    finalPermissions[k] = targetData.permissions?.[k] ?? false;
                });
            }
            // Protect system perms
            ['canViewLogs', 'canManageDepartments'].forEach(k => {
                finalPermissions[k] = targetData.permissions?.[k] ?? false;
            });
            
            firestoreUpdate.permissions = finalPermissions;
        } else {
            firestoreUpdate.permissions = permissions;
        }
    }

    if (Object.keys(authUpdate).length > 0) {
        await adminAuth.updateUser(uid, authUpdate);
    }
    if (Object.keys(firestoreUpdate).length > 0) {
        await adminDb.collection('users').doc(uid).update(firestoreUpdate);
    }

    // Log the user update
    const { adminDb } = await import('@/lib/firebaseAdmin');
    const { FieldValue } = await import('firebase-admin/firestore');
    await adminDb.collection('systemLogs').add({
        action: 'User Updated',
        details: `Updated user profile for: ${targetData.email}`,
        user: caller.email,
        timestamp: FieldValue.serverTimestamp()
    });

    return Response.json({ success: true });
}

// DELETE /api/users/[uid] — delete from Auth + Firestore
export async function DELETE(request, { params }) {
    let caller;
    try {
        caller = await requireAdmin(request);
    } catch (e) {
        return e.message === 'FORBIDDEN' ? forbidden() : unauthorized();
    }

    const { uid } = await params;
    if (uid === caller.uid) {
        return Response.json({ error: 'You cannot delete your own account' }, { status: 400 });
    }

    // Fetch target user
    const targetDoc = await adminDb.collection('users').doc(uid).get();
    if (!targetDoc.exists) return Response.json({ error: 'User not found' }, { status: 404 });
    const targetData = targetDoc.data();

    // SECURITY CHECKS:
    // Only Super Admin can delete other Admins or Super Admins
    if (!caller.isSuperAdmin && (targetData.isAdmin || targetData.isSuperAdmin)) {
        return Response.json({ error: 'Only Super Admins can delete administrative accounts' }, { status: 403 });
    }

    await adminAuth.deleteUser(uid);
    await adminDb.collection('users').doc(uid).delete();

    // Log the user deletion
    const { adminDb } = await import('@/lib/firebaseAdmin');
    const { FieldValue } = await import('firebase-admin/firestore');
    await adminDb.collection('systemLogs').add({
        action: 'User Deleted',
        details: `Deleted user: ${targetData.email}`,
        user: caller.email,
        timestamp: FieldValue.serverTimestamp()
    });

    return Response.json({ success: true });
}
