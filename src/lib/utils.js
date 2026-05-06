import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export function getSriLankaTime() {
    // Sri Lanka is UTC+5:30
    return new Date();
}

export function formatSriLankaTimestamp(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export async function addLog(currentSite, user, action, details) {
    if (!currentSite) return;

    try {
        const sriLankaTime = getSriLankaTime();
        const timestamp = formatSriLankaTimestamp(sriLankaTime);

        await addDoc(collection(db, currentSite.logsCollection), {
            action,
            details,
            user: user?.displayName || 'System',
            site: currentSite.name,
            timestamp: timestamp,
            createdAt: serverTimestamp(),
            date: sriLankaTime.toISOString().split('T')[0],
            hour: sriLankaTime.getHours(),
            minute: sriLankaTime.getMinutes()
        });
        console.log(`✅ Log saved: ${action}`);
    } catch (error) {
        console.error("❌ Error saving log:", error);
    }
}
