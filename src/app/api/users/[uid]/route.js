import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

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

// PATCH /api/users/[uid] — update displayName, isAdmin, or permissions
export async function PATCH(request, { params }) {
    try {
        await requireAdmin(request);
    } catch (e) {
        return e.message === 'FORBIDDEN' ? forbidden() : unauthorized();
    }

    const { uid } = await params;
    const body = await request.json();
    const { displayName, isAdmin, permissions } = body;

    const firestoreUpdate = {};
    const authUpdate = {};

    if (displayName !== undefined) {
        firestoreUpdate.displayName = displayName;
        authUpdate.displayName = displayName;
    }
    if (isAdmin !== undefined) firestoreUpdate.isAdmin = isAdmin;
    if (permissions !== undefined) firestoreUpdate.permissions = permissions;

    if (Object.keys(authUpdate).length > 0) {
        await adminAuth.updateUser(uid, authUpdate);
    }
    if (Object.keys(firestoreUpdate).length > 0) {
        await adminDb.collection('users').doc(uid).update(firestoreUpdate);
    }

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

    await adminAuth.deleteUser(uid);
    await adminDb.collection('users').doc(uid).delete();

    return Response.json({ success: true });
}
