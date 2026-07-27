import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env.local');
const envContent = readFileSync(envPath, 'utf8');
const envMatch = envContent.match(/FIREBASE_SERVICE_ACCOUNT_KEY=(['"]?)(.+?)\1\s*$/m) || envContent.match(/FIREBASE_SERVICE_ACCOUNT_KEY=(.+)$/m);

if (!envMatch) {
    console.error('❌ Could not find FIREBASE_SERVICE_ACCOUNT_KEY');
    process.exit(1);
}

const jsonString = envMatch[2] || envMatch[1];
const serviceAccount = JSON.parse(jsonString.trim());

const app = initializeApp({ credential: cert(serviceAccount) });
const adminDb = getFirestore(app);

// Get backup file path from command line arguments
const backupFileArg = process.argv[2];
if (!backupFileArg) {
    console.error('❌ Please specify the backup file to restore. Example:');
    console.error('   node scripts/restore-db.mjs backups/firestore-backup-YYYY-MM-DD.json');
    process.exit(1);
}

const backupPath = resolve(process.cwd(), backupFileArg);

async function main() {
    console.log(`📖 Reading backup file from: ${backupPath}`);
    let backupData;
    try {
        const rawData = readFileSync(backupPath, 'utf8');
        backupData = JSON.parse(rawData);
    } catch (err) {
        console.error('❌ Error reading or parsing backup file:', err.message);
        process.exit(1);
    }

    console.log('🔄 Connecting to Firestore...');
    
    for (const [collectionName, documents] of Object.entries(backupData)) {
        console.log(`📤 Restoring collection: "${collectionName}"...`);
        const batch = adminDb.batch();
        let count = 0;
        
        for (const [docId, docData] of Object.entries(documents)) {
            const docRef = adminDb.collection(collectionName).doc(docId);
            batch.set(docRef, docData);
            count++;
            
            // Firestore batches are limited to 500 operations
            if (count % 400 === 0) {
                await batch.commit();
                console.log(`   Written ${count} documents...`);
            }
        }
        
        if (count % 400 !== 0) {
            await batch.commit();
        }
        console.log(`   ✔ Restored ${count} documents to "${collectionName}"`);
    }

    console.log('\n======================================');
    console.log(`✅ Database restoration complete!`);
    console.log('======================================\n');
    process.exit(0);
}

main().catch(console.error);
