"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    setPersistence,
    browserSessionPersistence,
    getIdToken,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    /**
     * Fetch the Firestore user profile (permissions + isAdmin) for a Firebase Auth user.
     * Returns the enriched user object.
     */
    async function buildUserProfile(firebaseUser) {
        const profileSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
        const profile = profileSnap.exists() ? profileSnap.data() : {};
        return {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: profile.displayName || firebaseUser.displayName || firebaseUser.email.split('@')[0],
            isAdmin: profile.isAdmin === true,
            permissions: profile.permissions || {},
            forcePasswordChange: profile.forcePasswordChange === true,
        };
    }

    useEffect(() => {
        let unsubscribe;

        setPersistence(auth, browserSessionPersistence).then(() => {
            unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
                if (firebaseUser) {
                    const profile = await buildUserProfile(firebaseUser);
                    setUser(profile);
                } else {
                    setUser(null);
                }
                setLoading(false);
            });
        });

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    const login = (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    const logout = async () => {
        setUser(null);
        await signOut(auth);
    };

    /**
     * Re-fetch the current user's Firestore profile.
     * Call this after an admin changes your own permissions.
     */
    const refreshUserProfile = async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        const profile = await buildUserProfile(currentUser);
        setUser(profile);
    };

    /**
     * Returns the current Firebase ID token for use in API requests.
     */
    const getAuthToken = async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) return null;
        return getIdToken(currentUser);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, refreshUserProfile, getAuthToken }}>
            {loading ? (
                <div className="flex items-center justify-center min-h-screen bg-black">
                    <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"></div>
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
