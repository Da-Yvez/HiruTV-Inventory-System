/**
 * Update Branding Script — update site fullName and name in Firestore.
 * Run once: node scripts/update-branding.mjs
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
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

// Init Admin SDK
const app = initializeApp({ credential: cert(serviceAccount) });
const adminDb = getFirestore(app);

async function main() {
    console.log(`\n🔍 Updating Branding for 'hls' site...`);

    const siteRef = adminDb.collection('sites').doc('hls');
    
    await siteRef.set({
        name: "Life Studio",
        fullName: "Hiru Life Studio"
    }, { merge: true });

    console.log(`\n🎉 Success! 'hls' site updated in Firestore.`);
    console.log('   Name: Life Studio');
    console.log('   Full Name: Hiru Life Studio\n');

    process.exit(0);
}

main().catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
});
