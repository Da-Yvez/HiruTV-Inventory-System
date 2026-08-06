import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

async function requireSuperAdmin(request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        throw new Error('UNAUTHORIZED');
    }
    const idToken = authHeader.slice(7);
    const decoded = await adminAuth.verifyIdToken(idToken);
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    
    if (!userDoc.exists) {
        throw new Error('FORBIDDEN');
    }
    
    const userData = userDoc.data();
    if (!userData.isSuperAdmin) {
        throw new Error('FORBIDDEN');
    }
    
    return { ...decoded, ...userData };
}

// PATCH /api/whats-new/[id] - Update an announcement
export async function PATCH(request, { params }) {
    let caller;
    try {
        caller = await requireSuperAdmin(request);
    } catch (e) {
        return Response.json({ error: e.message === 'FORBIDDEN' ? 'Forbidden' : 'Unauthorized' }, { status: e.message === 'FORBIDDEN' ? 403 : 401 });
    }

    try {
        const { id } = await params;
        const body = await request.json();
        const { headline, description, targetPermissions, active } = body;

        const updateData = {};
        if (headline !== undefined) updateData.headline = headline;
        if (description !== undefined) updateData.description = description;
        if (targetPermissions !== undefined) updateData.targetPermissions = targetPermissions;
        if (active !== undefined) updateData.active = active;
        
        updateData.updatedAt = FieldValue.serverTimestamp();
        updateData.updatedBy = caller.email;

        await adminDb.collection('whatsNewMessages').doc(id).update(updateData);

        return Response.json({ success: true });
    } catch (e) {
        console.error('[API] PATCH Whats New failed:', e.message || e);
        return Response.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE /api/whats-new/[id] - Delete an announcement
export async function DELETE(request, { params }) {
    let caller;
    try {
        caller = await requireSuperAdmin(request);
    } catch (e) {
        return Response.json({ error: e.message === 'FORBIDDEN' ? 'Forbidden' : 'Unauthorized' }, { status: e.message === 'FORBIDDEN' ? 403 : 401 });
    }

    try {
        const { id } = await params;
        await adminDb.collection('whatsNewMessages').doc(id).delete();
        return Response.json({ success: true });
    } catch (e) {
        console.error('[API] DELETE Whats New failed:', e.message || e);
        return Response.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
