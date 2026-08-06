import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * GET /api/backup
 * Exports all Firestore collections as a single JSON file.
 * Restricted to Administrators and Super Administrators.
 */
export async function GET(request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const decoded = await adminAuth.verifyIdToken(token);

        // Verify the user has backup permissions
        const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const userData = userDoc.data();
        const hasBackupAccess = userData.isSuperAdmin === true || (userData.isAdmin === true && userData.permissions?.canBackupDatabase === true);
        if (!hasBackupAccess) {
            return NextResponse.json({ error: 'Forbidden — database backup access required' }, { status: 403 });
        }

        console.log(`[BACKUP API] User ${userDoc.data().email} started backup...`);
        const collections = await adminDb.listCollections();
        const backupData = {};

        for (const coll of collections) {
            const snapshot = await coll.get();
            backupData[coll.id] = {};
            snapshot.docs.forEach(doc => {
                backupData[coll.id][doc.id] = doc.data();
            });
        }

        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `firestore-backup-${timestamp}.json`;

        return new Response(JSON.stringify(backupData, null, 2), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error('[BACKUP API GET] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * POST /api/backup
 * Restores database collections from a JSON backup.
 * Restricted to Administrators and Super Administrators.
 */
export async function POST(request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const decoded = await adminAuth.verifyIdToken(token);

        // Verify the user has backup permissions
        const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const userData = userDoc.data();
        const hasBackupAccess = userData.isSuperAdmin === true || (userData.isAdmin === true && userData.permissions?.canBackupDatabase === true);
        if (!hasBackupAccess) {
            return NextResponse.json({ error: 'Forbidden — database backup access required' }, { status: 403 });
        }

        const backupData = await request.json();
        if (!backupData || typeof backupData !== 'object') {
            return NextResponse.json({ error: 'Invalid backup format' }, { status: 400 });
        }

        console.log(`[BACKUP API] User ${userDoc.data().email} started database restore...`);

        // Track what collections and document count are restored
        const summary = {};

        for (const [collectionName, documents] of Object.entries(backupData)) {
            if (typeof documents !== 'object') continue;

            const docEntries = Object.entries(documents);
            summary[collectionName] = docEntries.length;

            let batch = adminDb.batch();
            let count = 0;

            for (const [docId, docData] of docEntries) {
                const docRef = adminDb.collection(collectionName).doc(docId);
                batch.set(docRef, docData);
                count++;

                if (count % 400 === 0) {
                    await batch.commit();
                    batch = adminDb.batch();
                }
            }

            if (count % 400 !== 0) {
                await batch.commit();
            }
        }

        // Add a log to systemLogs
        await adminDb.collection('systemLogs').add({
            action: 'DATABASE_RESTORE',
            details: `Database restored from backup. Collections restored: ${JSON.stringify(summary)}`,
            user: userDoc.data().email || 'Admin',
            timestamp: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ success: true, summary });
    } catch (error) {
        console.error('[BACKUP API POST] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
