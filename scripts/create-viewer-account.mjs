/**
 * Predefined Account Script — Create the viewer@hirutv.lk account.
 * Run: node scripts/create-viewer-account.mjs
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local manually
const envPath = resolve(__dirname, '../.env.local');
const envContent = readFileSync(envPath, 'utf8');
const envMatch = envContent.match(/FIREBASE_SERVICE_ACCOUNT_KEY=(['"]?)(.+?)\1\s*$/m) || envContent.match(/FIREBASE_SERVICE_ACCOUNT_KEY=(.+)$/m);
if (!envMatch) {
    console.error('❌ Could not find FIREBASE_SERVICE_ACCOUNT_KEY in .env.local');
    process.exit(1);
}
const jsonString = envMatch[2] || envMatch[1];
const serviceAccount = JSON.parse(jsonString.trim());

const app = initializeApp({ credential: cert(serviceAccount) });
const adminAuth = getAuth(app);
const adminDb = getFirestore(app);

const VIEWER_EMAIL = 'viewer@hirutv.lk';
const VIEWER_PASSWORD = 'HiruViewer123!'; // User should change this later

async function main() {
    console.log(`\n🔍 Checking for predefined viewer account: ${VIEWER_EMAIL}`);

    let authUser;
    try {
        authUser = await adminAuth.getUserByEmail(VIEWER_EMAIL);
        console.log(`✅ User already exists (uid: ${authUser.uid})`);
    } catch (e) {
        console.log(`👤 Creating new Firebase Auth user...`);
        authUser = await adminAuth.createUser({
            email: VIEWER_EMAIL,
            password: VIEWER_PASSWORD,
            displayName: 'Public Viewer',
            emailVerified: true
        });
        console.log(`✅ Created user (uid: ${authUser.uid})`);
    }

    const userRef = adminDb.collection('users').doc(authUser.uid);
    const existing = await userRef.get();

    const data = {
        uid: authUser.uid,
        email: authUser.email,
        displayName: 'Public Viewer',
        isAdmin: false,
        isSuperAdmin: false,
        permissions: {
            canAccessWTC: true,
            canAccessHLS: true,
            wtc_canAdd: false,
            wtc_canEdit: false,
            wtc_canDelete: false,
            hls_canAdd: false,
            hls_canEdit: false,
            hls_canDelete: false,
            canViewLogs: false,
            canManageDepartments: false,
            manage_wtc: false,
            manage_hls: false,
        },
        forcePasswordChange: false, 
        createdAt: (existing.exists && existing.data().createdAt) ? existing.data().createdAt : FieldValue.serverTimestamp(),
        createdBy: 'setup-script',
    };

    await userRef.set(data, { merge: true });

    console.log(`\n🎉 Success! Public Viewer account is ready.`);
    console.log(`   Email: ${VIEWER_EMAIL}`);
    console.log(`   Initial Password: ${VIEWER_PASSWORD}`);
    console.log(`\n   The viewer can now log in to the QR scan page to view asset details.\n`);

    process.exit(0);
}

main().catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
});
