import { readFileSync, writeFileSync, mkdirSync } from 'fs';
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

async function main() {
    console.log('🔄 Connecting to Firestore...');
    const collections = await adminDb.listCollections();
    const backupData = {};
    
    console.log('📦 Starting backup of all collections...');
    for (const coll of collections) {
        console.log(`   Downloading collection: "${coll.id}"...`);
        const snapshot = await coll.get();
        backupData[coll.id] = {};
        
        snapshot.docs.forEach(doc => {
            backupData[coll.id][doc.id] = doc.data();
        });
        console.log(`   ✔ Backed up ${snapshot.size} documents from "${coll.id}"`);
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = resolve(__dirname, '../backups');
    const backupPath = resolve(backupDir, `firestore-backup-${timestamp}.json`);
    
    // Ensure backups folder exists
    mkdirSync(backupDir, { recursive: true });
    
    // Write backup file
    writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');
    
    console.log('\n======================================');
    console.log(`✅ Backup successfully completed!`);
    console.log(`💾 Saved to: ${backupPath}`);
    console.log('======================================\n');
    
    process.exit(0);
}

main().catch(console.error);
