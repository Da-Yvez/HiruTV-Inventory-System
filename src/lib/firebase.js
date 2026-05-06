import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyC7GcDDHQqUsOVKrkux7WaSpH7gzYHEsXU",
    authDomain: "inventory-3650f.firebaseapp.com",
    databaseURL: "https://inventory-3650f-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "inventory-3650f",
    storageBucket: "inventory-3650f.firebasestorage.app",
    messagingSenderId: "788791862955",
    appId: "1:788791862955:web:280dc7b46f9ee5eb1a79ee",
    measurementId: "G-1NTLEP3DFE"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
export default app;
