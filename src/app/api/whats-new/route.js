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

// GET /api/whats-new - List all announcements
export async function GET(request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const idToken = authHeader.slice(7);
        await adminAuth.verifyIdToken(idToken); // verify they are logged in

        const snapshot = await adminDb.collection('whatsNewMessages').orderBy('createdAt', 'desc').get();
        const messages = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Convert Firestore timestamps to seconds/nanoseconds to match client expectation
                createdAt: data.createdAt ? { seconds: Math.floor(data.createdAt.toDate().getTime() / 1000) } : null,
                updatedAt: data.updatedAt ? { seconds: Math.floor(data.updatedAt.toDate().getTime() / 1000) } : null,
            };
        });

        return Response.json({ messages });
    } catch (e) {
        console.error('[API] GET Whats New failed:', e.message || e);
        return Response.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}

// POST /api/whats-new - Create a new announcement
export async function POST(request) {
    let caller;
    try {
        caller = await requireSuperAdmin(request);
    } catch (e) {
        return Response.json({ error: e.message === 'FORBIDDEN' ? 'Forbidden' : 'Unauthorized' }, { status: e.message === 'FORBIDDEN' ? 403 : 401 });
    }

    try {
        const body = await request.json();
        const { headline, description, targetPermissions, active } = body;

        if (!headline || !description) {
            return Response.json({ error: 'Headline and description are required' }, { status: 400 });
        }

        const docRef = await adminDb.collection('whatsNewMessages').add({
            headline,
            description,
            targetPermissions: targetPermissions || ['all'],
            active: active !== false,
            createdAt: FieldValue.serverTimestamp(),
            createdBy: caller.email,
            updatedAt: FieldValue.serverTimestamp(),
            updatedBy: caller.email,
        });

        return Response.json({ success: true, id: docRef.id }, { status: 201 });
    } catch (e) {
        console.error('[API] POST Whats New failed:', e.message || e);
        return Response.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
