/**
 * Migration Script — Add unique qrKeys to all existing devices.
 * Run: node scripts/migrate-qr-keys.mjs
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

const app = initializeApp({ credential: cert(serviceAccount) });
const adminDb = getFirestore(app);

function generateQRKey() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

async function main() {
    const collections = ['devices_hls', 'devices_wtc'];
    let totalMigrated = 0;

    for (const collName of collections) {
        console.log(`\n📦 Processing collection: ${collName}`);
        const snapshot = await adminDb.collection(collName).get();
        
        if (snapshot.empty) {
            console.log('   No devices found.');
            continue;
        }

        const batch = adminDb.batch();
        let collMigrated = 0;

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (!data.qrKey) {
                const qrKey = generateQRKey();
                batch.update(doc.ref, { qrKey });
                collMigrated++;
                totalMigrated++;
            }
        });

        if (collMigrated > 0) {
            await batch.commit();
            console.log(`   ✅ Migrated ${collMigrated} devices.`);
        } else {
            console.log('   All devices already have qrKeys.');
        }
    }

    console.log(`\n🎉 Finished! Total devices migrated: ${totalMigrated}\n`);
    process.exit(0);
}

main().catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
});
