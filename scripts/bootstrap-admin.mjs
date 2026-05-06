/**
 * Bootstrap Script — promote a user to admin.
 * Run once: node scripts/bootstrap-admin.mjs
 *
 * This sets isAdmin: true and all permissions on the specified email account,
 * creating the Firestore users/{uid} doc if it doesn't exist yet.
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local manually (Next.js env isn't loaded by Node by default)
const envPath = resolve(__dirname, '../.env.local');
const envContent = readFileSync(envPath, 'utf8');
const envMatch = envContent.match(/FIREBASE_SERVICE_ACCOUNT_KEY=(['"]?)(.+?)\1\s*$/m) || envContent.match(/FIREBASE_SERVICE_ACCOUNT_KEY=(.+)$/m);
if (!envMatch) {
    console.error('❌ Could not find FIREBASE_SERVICE_ACCOUNT_KEY in .env.local');
    process.exit(1);
}
// If the first regex matched, the JSON is in group 2. If the second matched, it's in group 1.
const jsonString = envMatch[2] || envMatch[1];
const serviceAccount = JSON.parse(jsonString.trim());

// Init Admin SDK
const app = initializeApp({ credential: cert(serviceAccount) });
const adminAuth = getAuth(app);
const adminDb = getFirestore(app);

const TARGET_EMAIL = 'navindra@inventory.system';

const ALL_PERMISSIONS = {
    canAccessWTC:           true,
    wtc_canAdd:             true,
    wtc_canEdit:            true,
    wtc_canDelete:          true,
    canAccessHLS:           true,
    hls_canAdd:             true,
    hls_canEdit:            true,
    hls_canDelete:          true,
    canViewLogs:            true,
    canManageDepartments:   true,
};

async function main() {
    console.log(`\n🔍 Looking up Firebase Auth user: ${TARGET_EMAIL}`);

    let authUser;
    try {
        authUser = await adminAuth.getUserByEmail(TARGET_EMAIL);
        console.log(`✅ Found user: ${authUser.displayName || authUser.email} (uid: ${authUser.uid})`);
    } catch (e) {
        console.error(`❌ No Firebase Auth user found with email "${TARGET_EMAIL}".`);
        console.error('   Make sure the account exists in Firebase Auth first.');
        process.exit(1);
    }

    const userRef = adminDb.collection('users').doc(authUser.uid);
    const existing = await userRef.get();

    const data = {
        uid: authUser.uid,
        email: authUser.email,
        displayName: authUser.displayName || 'Navindra',
        isAdmin: true,
        permissions: ALL_PERMISSIONS,
        forcePasswordChange: false, // Don't force for the initial bootstrap admin
        createdAt: (existing.exists && existing.data().createdAt) ? existing.data().createdAt : FieldValue.serverTimestamp(),
        createdBy: 'bootstrap',
    };

    await userRef.set(data, { merge: true });

    console.log(`\n🎉 Success! "${data.displayName}" is now a full Administrator.`);
    console.log('   Firestore users/' + authUser.uid + ' has been written.');
    console.log('\n   You can now log in and create other users from the User Management page.\n');

    process.exit(0);
}

main().catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
});
