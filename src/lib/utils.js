import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"
import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export async function addLog(site, user, action, details) {
    if (!site || !site.logsCollection) return;
    
    try {
        await addDoc(collection(db, site.logsCollection), {
            action,
            details,
            user: user?.email || user?.displayName || 'Unknown User',
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.error("Error adding log:", error);
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

