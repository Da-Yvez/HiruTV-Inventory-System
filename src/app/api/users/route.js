import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { DEFAULT_PERMISSIONS } from '@/lib/permissions';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Verify the Authorization header and confirm the caller is an admin.
 * Returns the decoded token or throws.
 */
async function requireAdmin(request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        throw new Error('UNAUTHORIZED');
    }
    const idToken = authHeader.slice(7);
    const decoded = await adminAuth.verifyIdToken(idToken);

    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists || userDoc.data().isAdmin !== true) {
        throw new Error('FORBIDDEN');
    }
    return decoded;
}

function unauthorized() {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
function forbidden() {
    return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });
}

// GET /api/users — list all users
export async function GET(request) {
    try {
        await requireAdmin(request);
    } catch (e) {
        return e.message === 'FORBIDDEN' ? forbidden() : unauthorized();
    }

    const snapshot = await adminDb.collection('users').orderBy('createdAt', 'desc').get();
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return Response.json({ users });
}

// POST /api/users — create a new user
export async function POST(request) {
    let caller;
    try {
        caller = await requireAdmin(request);
    } catch (e) {
        return e.message === 'FORBIDDEN' ? forbidden() : unauthorized();
    }

    const { email, password, displayName, isAdmin = false, permissions = {} } = await request.json();

    if (!email || !password || !displayName) {
        return Response.json({ error: 'email, password, and displayName are required' }, { status: 400 });
    }

    // Create in Firebase Auth
    let authUser;
    try {
        authUser = await adminAuth.createUser({ email, password, displayName });
    } catch (e) {
        return Response.json({ error: e.message }, { status: 400 });
    }

    // Write Firestore profile
    const mergedPermissions = { ...DEFAULT_PERMISSIONS, ...permissions };
    await adminDb.collection('users').doc(authUser.uid).set({
        uid: authUser.uid,
        email,
        displayName,
        isAdmin,
        permissions: mergedPermissions,
        forcePasswordChange: true, // Force change on first login
        createdAt: FieldValue.serverTimestamp(),
        createdBy: caller.uid,
    });

    return Response.json({ success: true, uid: authUser.uid }, { status: 201 });
}
