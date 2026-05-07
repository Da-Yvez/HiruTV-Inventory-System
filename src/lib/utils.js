import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Write an activity log entry via the secure server-side API route.
 * Using the Admin SDK on the server bypasses Firestore security rules,
 * which prevents the "flash then disappear" bug caused by rule rejections.
 */
export async function addLog(site, user, action, details) {
    if (!site || !site.logsCollection) return;

    try {
        // Dynamically import to avoid SSR issues
        const { auth } = await import('./firebase');
        const { getIdToken } = await import('firebase/auth');

        const currentUser = auth.currentUser;
        if (!currentUser) {
            console.warn('[addLog] No authenticated user — skipping log write.');
            return;
        }

        const token = await getIdToken(currentUser);

        const response = await fetch('/api/logs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                logsCollection: site.logsCollection,
                action,
                details: details || '',
                user: user?.email || user?.displayName || 'Unknown User',
            }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            console.error('[addLog] API error:', err);
        }
    } catch (error) {
        console.error('[addLog] Failed to write log:', error);
    }
}

/**
 * Generate a random 12-character alphanumeric key for secure QR links.
 */
export function generateQRKey() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
