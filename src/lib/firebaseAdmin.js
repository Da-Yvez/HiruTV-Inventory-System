import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminApp() {
    const apps = getApps();
    // Use a dedicated named app for the Admin SDK to avoid conflicts with HMR/default app
    const adminApp = apps.find(a => a.name === 'admin-sdk');
    if (adminApp) return adminApp;

    try {
        let saString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (!saString) {
            console.error('[ADMIN-SDK] FIREBASE_SERVICE_ACCOUNT_KEY is missing from environment');
            return null;
        }

        // Strip extra quotes if present
        if (saString.startsWith("'") && saString.endsWith("'")) {
            saString = saString.slice(1, -1);
        }
        
        const serviceAccount = JSON.parse(saString);
        
        // Common fix for private key newlines
        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }

        console.log(`[ADMIN-SDK] Initializing "admin-sdk" for project: ${serviceAccount.project_id}`);

        return initializeApp({
            credential: cert(serviceAccount),
            projectId: serviceAccount.project_id,
        }, 'admin-sdk');
    } catch (err) {
        console.error('[ADMIN-SDK] Initialization failed:', err.message);
        return null;
    }
}

const adminApp = getAdminApp();
const adminAuth = getAuth(adminApp);
const adminDb = getFirestore(adminApp);

export { adminAuth, adminDb };
