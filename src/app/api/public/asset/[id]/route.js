import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function GET(request, { params }) {
    const { id } = await params;

    if (!id) {
        return NextResponse.json({ error: 'Asset ID is required' }, { status: 400 });
    }

    try {
        console.log(`[API] Fetching public asset info for: ${id}`);
        
        // 1. Generate all possible search variations
        const originalId = id.trim();
        const normalizedId = originalId.replace(/\//g, '-');
        const slashesId = originalId.replace(/\-/g, '/');
        
        const variations = new Set([originalId, normalizedId, slashesId]);
        
        // Handle leading zeros (e.g. 05 -> 5)
        const parts = originalId.split(/[\/\-]/);
        let hasNumeric = false;
        const altParts = parts.map(part => {
            const num = parseInt(part, 10);
            if (!isNaN(num) && num.toString() !== part) {
                hasNumeric = true;
                return num.toString();
            }
            return part;
        });
        
        if (hasNumeric) {
            variations.add(altParts.join('/'));
            variations.add(altParts.join('-'));
        }

        const searchTerms = Array.from(variations);
        console.log(`[API] Searching with terms: ${searchTerms.join(', ')}`);
        
        const collections = ['devices_hls', 'devices_wtc'];
        let deviceData = null;

        for (const coll of collections) {
            // A. Search by qrKey
            let snap = await adminDb.collection(coll).where('qrKey', 'in', searchTerms).limit(1).get();
            
            if (snap.empty) {
                // B. Search by pcNumber
                snap = await adminDb.collection(coll).where('pcNumber', 'in', searchTerms).limit(1).get();
            }

            if (snap.empty) {
                // C. Search in legacyKeys array
                snap = await adminDb.collection(coll).where('legacyKeys', 'array-contains-any', searchTerms).limit(1).get();
            }

            if (!snap.empty) {
                console.log(`[API] Found device in ${coll}`);
                deviceData = snap.docs[0].data();
                break;
            }
        }
        if (!deviceData) {
            console.warn(`[API] Asset not found after all fallbacks: ${id}`);
            return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
        }

        return NextResponse.json(deviceData);
    } catch (error) {
        console.error('Public Asset API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
