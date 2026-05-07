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
    const userData = userDoc.data();
    if (!userDoc.exists || (!userData.isAdmin && !userData.isSuperAdmin)) {
        throw new Error('FORBIDDEN');
    }
    return { ...decoded, ...userData };
}

function unauthorized() {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
function forbidden() {
    return Response.json({ error: 'Forbidden — administrative access only' }, { status: 403 });
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

    const { email, password, displayName, isAdmin = false, isSuperAdmin = false, permissions = {} } = await request.json();

    if (!email || !password || !displayName) {
        return Response.json({ error: 'email, password, and displayName are required' }, { status: 400 });
    }

    // ROLE VALIDATION:
    // Only Super Admin can create other Admins or Super Admins.
    if (!caller.isSuperAdmin && (isAdmin || isSuperAdmin)) {
        return Response.json({ error: 'Only Super Admins can create administrative accounts' }, { status: 403 });
    }

    // PERMISSION VALIDATION:
    // If caller is Admin, they can only assign permissions for sites they manage.
    if (!caller.isSuperAdmin && caller.isAdmin) {
        const restrictedPerms = { ...permissions };
        
        // If they don't have manage_wtc, strip WTC perms
        if (!caller.permissions?.manage_wtc) {
            delete restrictedPerms.canAccessWTC;
            delete restrictedPerms.wtc_canAdd;
            delete restrictedPerms.wtc_canEdit;
            delete restrictedPerms.wtc_canDelete;
            delete restrictedPerms.manage_wtc;
        }
        
        // If they don't have manage_hls, strip HLS perms
        if (!caller.permissions?.manage_hls) {
            delete restrictedPerms.canAccessHLS;
            delete restrictedPerms.hls_canAdd;
            delete restrictedPerms.hls_canEdit;
            delete restrictedPerms.hls_canDelete;
            delete restrictedPerms.manage_hls;
        }

        // Admins cannot grant system-wide perms unless they have them? 
        // Actually, let's just say they can't grant system-wide perms at all to be safe.
        delete restrictedPerms.canViewLogs;
        delete restrictedPerms.canManageDepartments;
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
    
    // If Admin created it, ensure the filtered perms are used (above logic modified permissions)
    await adminDb.collection('users').doc(authUser.uid).set({
        uid: authUser.uid,
        email,
        displayName,
        isAdmin,
        isSuperAdmin,
        permissions: mergedPermissions,
        forcePasswordChange: true, 
        createdAt: FieldValue.serverTimestamp(),
        createdBy: caller.uid,
    });

    return Response.json({ success: true, uid: authUser.uid }, { status: 201 });
}
