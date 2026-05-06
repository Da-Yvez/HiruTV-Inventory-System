import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

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
            timestamp: new Date().toLocaleString()
        });
    } catch (error) {
        console.error("Error adding log:", error);
    }
}

