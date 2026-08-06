import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { NextResponse } from 'next/server';

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

export async function GET(request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const decoded = await adminAuth.verifyIdToken(token);

        // Verify the user has admin/superadmin permissions
        const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        
        const userData = userDoc.data();
        const isAdminOrSuperAdmin = userData.isAdmin === true || userData.isSuperAdmin === true;
        if (!isAdminOrSuperAdmin) {
            return NextResponse.json({ error: 'Forbidden — Administrator access required' }, { status: 403 });
        }

        console.log(`[DB USAGE API] Fetching all collections for ${userData.email}...`);
        const collections = await adminDb.listCollections();
        
        let totalBytes = 0;
        let totalDocs = 0;
        const report = [];

        for (const coll of collections) {
            const snapshot = await coll.get();
            let collBytes = 0;
            const count = snapshot.size;
            
            snapshot.docs.forEach(doc => {
                collBytes += estimateDocSize(doc);
            });
            
            totalBytes += collBytes;
            totalDocs += count;
            
            report.push({
                id: coll.id,
                count,
                bytes: collBytes
            });
        }

        return NextResponse.json({
            report,
            totalDocs,
            totalBytes,
            limitBytes: 1073741824, // 1 GiB Spark Limit
        });

    } catch (error) {
        console.error('[DB USAGE API GET] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
