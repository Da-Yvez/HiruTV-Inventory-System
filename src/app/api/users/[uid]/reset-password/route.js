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

    // Get the user's email from Auth
    const authUser = await adminAuth.getUser(uid);
    if (!authUser.email) {
        return Response.json({ error: 'User has no email address' }, { status: 400 });
    }

    // Generate a password reset link (Firebase sends the email)
    const link = await adminAuth.generatePasswordResetLink(authUser.email);

    // Return the link so the admin can share it manually (or Firebase sends it if actionCodeSettings configured)
    return Response.json({ success: true, resetLink: link, email: authUser.email });
}
