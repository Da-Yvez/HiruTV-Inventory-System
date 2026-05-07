import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';

/**
 * GET /api/logs?collection=activityLogs_wtc&limit=100
 * Reads logs via Admin SDK — bypasses all Firestore security rules.
 */
export async function GET(request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        await adminAuth.verifyIdToken(token);

        const { searchParams } = new URL(request.url);
        const logsCollection = searchParams.get('collection');
        const limitCount = parseInt(searchParams.get('limit') || '100', 10);

        if (!logsCollection) {
            return NextResponse.json({ error: 'Missing ?collection= param' }, { status: 400 });
        }

        let snapshot;
        try {
            snapshot = await adminDb
                .collection(logsCollection)
                .orderBy('timestamp', 'desc')
                .limit(limitCount)
                .get();
        } catch (queryError) {
            console.error('[LOGS API GET] Query failed, attempting fallback:', queryError.message);
            // Fallback: fetch without orderBy and sort in memory (useful if index is missing)
            snapshot = await adminDb
                .collection(logsCollection)
                .limit(limitCount)
                .get();
        }

        const logs = snapshot.docs.map(doc => {
            const data = doc.data();
            let tsValue = null;
            
            if (data.timestamp) {
                if (typeof data.timestamp.toMillis === 'function') {
                    tsValue = data.timestamp.toMillis();
                } else if (typeof data.timestamp === 'number') {
                    tsValue = data.timestamp;
                } else if (typeof data.timestamp === 'string') {
                    // Try to parse string timestamps (legacy data)
                    const parsed = Date.parse(data.timestamp);
                    if (!isNaN(parsed)) tsValue = parsed;
                }
            }

            return {
                id: doc.id,
                ...data,
                timestamp: tsValue,
            };
        });

        // Re-sort in memory just in case the fallback was used
        logs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        return NextResponse.json({ logs });
    } catch (error) {
        console.error('[LOGS API GET] Critical Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        // 1. Verify the caller is a valid authenticated user
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        await adminAuth.verifyIdToken(token);

        // 2. Parse the request body
        const { logsCollection, action, details, user } = await request.json();

        if (!logsCollection || !action) {
            return NextResponse.json({ error: 'Missing required fields: logsCollection, action' }, { status: 400 });
        }

        // 3. Write the log using the Admin SDK — bypasses all Firestore security rules
        await adminDb.collection(logsCollection).add({
            action,
            details: details || '',
            user: user || 'Unknown User',
            timestamp: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[LOGS API] Error writing log:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
