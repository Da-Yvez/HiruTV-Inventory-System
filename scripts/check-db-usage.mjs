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

// Simple estimator for Firestore document size in bytes based on official Firestore rules
function estimateValueSize(value) {
    if (value === null || value === undefined) return 1;
    if (typeof value === 'boolean') return 1;
    if (typeof value === 'number') return 8; // Assumes double or integer (8 bytes)
    if (typeof value === 'string') return Buffer.byteLength(value, 'utf8');
    if (value instanceof Date) return 8;
    if (value && typeof value.toDate === 'function') return 8; // Firestore Timestamp
    if (Array.isArray(value)) {
        let size = 32; // array overhead
        for (const item of value) {
            size += estimateValueSize(item);
        }
        return size;
    }
    if (typeof value === 'object') {
        // Check if it looks like a Firestore DocumentReference
        if (value.path && typeof value.path === 'string') {
            return Buffer.byteLength(value.path, 'utf8') + 16;
        }
        let size = 32; // map overhead
        for (const key in value) {
            if (Object.prototype.hasOwnProperty.call(value, key)) {
                size += Buffer.byteLength(key, 'utf8') + estimateValueSize(value[key]);
            }
        }
        return size;
    }
    return 8; // Default fallback
}

function estimateDocSize(doc) {
    const docPath = doc.ref.path;
    let size = 16 + Buffer.byteLength(docPath, 'utf8'); // Doc path overhead
    const data = doc.data();
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            size += Buffer.byteLength(key, 'utf8') + estimateValueSize(data[key]);
        }
    }
    return size;
}

async function main() {
    console.log('🔄 Fetching all collections from Firestore...');
    const collections = await adminDb.listCollections();
    
    let totalBytes = 0;
    let totalDocs = 0;
    
    console.log('\n📊 --- FIRESTORE USAGE REPORT ---');
    console.log('--------------------------------------------------');
    console.log(String('Collection Name').padEnd(25) + ' | ' + String('Doc Count').padEnd(10) + ' | ' + String('Est. Size').padEnd(12));
    console.log('--------------------------------------------------');
    
    for (const coll of collections) {
        const snapshot = await coll.get();
        let collBytes = 0;
        const count = snapshot.size;
        
        snapshot.docs.forEach(doc => {
            collBytes += estimateDocSize(doc);
        });
        
        totalBytes += collBytes;
        totalDocs += count;
        
        const sizeStr = formatSize(collBytes);
        console.log(coll.id.padEnd(25) + ' | ' + String(count).padEnd(10) + ' | ' + sizeStr.padEnd(12));
    }
    
    console.log('--------------------------------------------------');
    console.log(String('TOTAL DATABASE').padEnd(25) + ' | ' + String(totalDocs).padEnd(10) + ' | ' + formatSize(totalBytes).padEnd(12));
    console.log('--------------------------------------------------');
    console.log(`Free Spark Plan Limit: 1.0 GiB (1,073,741,824 bytes)`);
    console.log(`Usage Percentage: ${((totalBytes / 1073741824) * 100).toFixed(6)}%`);
    console.log('--------------------------------------------------\n');
    
    process.exit(0);
}

function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

main().catch(console.error);
