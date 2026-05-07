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

async function main() {
    const snapshot = await adminDb.collection('users').get();
    console.log('--- USERS IN FIRESTORE ---');
    snapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`Email: ${data.email}, isAdmin: ${data.isAdmin}, isSuperAdmin: ${data.isSuperAdmin}, UID: ${doc.id}`);
    });
    process.exit(0);
}

main().catch(console.error);
