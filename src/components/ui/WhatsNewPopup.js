"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { 
    updateDoc, 
    doc, 
    arrayUnion 
} from 'firebase/firestore';
import { Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function WhatsNewPopup() {
    const { getAuthToken, user, refreshUserProfile } = useAuth();
    const [pendingMessages, setPendingMessages] = useState([]);
    const [currentMessage, setCurrentMessage] = useState(null);
    const [dismissing, setDismissing] = useState(false);

    useEffect(() => {
        if (!user) return;

        const checkMessages = async () => {
            try {
                // Fetch active announcements via API
                const token = await getAuthToken();
                const res = await fetch('/api/whats-new', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!res.ok) throw new Error('Failed to fetch announcements');
                const data = await res.json();
                
                const activeMsgs = (data.messages || []).filter(msg => msg.active);

                const seenIds = user.seenWhatsNew || [];

                // Filter messages targeted at this user
                const targeted = activeMsgs.filter(msg => {
                    // 1. Skip if user has already seen this announcement
                    if (seenIds.includes(msg.id)) return false;

                    // 2. Superadmins see all active announcements (useful for testing/validation)
                    if (user.isSuperAdmin) return true;

                    // 3. Check target permissions
                    const targets = msg.targetPermissions || ['all'];
                    if (targets.includes('all')) return true;

                    // Check if user has at least one of the target permissions or roles
                    const hasTargetPermission = targets.some(perm => {
                        if (perm === 'role_admin') return user.isAdmin === true;
                        if (perm === 'role_superadmin') return user.isSuperAdmin === true;
                        return user.permissions?.[perm] === true;
                    });

                    return hasTargetPermission;
                });

                // Sort by creation date ascending so they see older updates first
                targeted.sort((a, b) => {
                    const timeA = a.createdAt?.seconds || 0;
                    const timeB = b.createdAt?.seconds || 0;
                    return timeA - timeB;
                });

                setPendingMessages(targeted);
                if (targeted.length > 0) {
                    setCurrentMessage(targeted[0]);
                } else {
                    setCurrentMessage(null);
                }
            } catch (e) {
                console.error("Error checking what's new messages:", e);
            }
        };

        checkMessages();
    }, [user]);

    const handleDismiss = async () => {
        if (!user || !currentMessage || dismissing) return;
        setDismissing(true);

        try {
            // Update Firestore with the dismissed message ID
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                seenWhatsNew: arrayUnion(currentMessage.id)
            });

            // Refresh user profile state to synchronize local context
            await refreshUserProfile();

            // Slide out of current message
            const nextPending = pendingMessages.slice(1);
            setPendingMessages(nextPending);
            if (nextPending.length > 0) {
                setCurrentMessage(nextPending[0]);
            } else {
                setCurrentMessage(null);
            }
        } catch (e) {
            console.error("Error dismissing What's New message:", e);
        } finally {
            setDismissing(false);
        }
    };

    if (!currentMessage) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="bg-gradient-to-b from-white to-[#F8FAFA] rounded-[36px] border border-white max-w-md w-full shadow-2xl p-8 relative overflow-hidden text-center"
                >
                    {/* Top glowing orange line */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 via-amber-400 to-red-500" />
                    
                    {/* Header close cross button */}
                    <button
                        onClick={handleDismiss}
                        disabled={dismissing}
                        className="absolute top-6 right-6 p-2 text-slate-400 hover:text-orange-500 hover:bg-slate-100 rounded-full transition-all disabled:opacity-50"
                    >
                        <X size={18} />
                    </button>

                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-500 rounded-[24px] flex items-center justify-center mx-auto mb-6 text-white shadow-xl shadow-orange-500/20">
                        <Sparkles size={30} className="animate-pulse" />
                    </div>

                    <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em]">What's New</span>
                    <h4 className="text-xl font-black text-[#003135] mt-2 mb-4 leading-tight">
                        {currentMessage.headline}
                    </h4>
                    
                    <div className="bg-white/60 backdrop-blur-sm border border-slate-100 rounded-2xl p-5 mb-6 max-h-60 overflow-y-auto text-left">
                        <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line font-medium">
                            {currentMessage.description}
                        </p>
                    </div>

                    <button
                        onClick={handleDismiss}
                        disabled={dismissing}
                        className="w-full py-4 bg-[#003135] text-white hover:text-orange-300 rounded-2xl font-black text-sm shadow-xl shadow-[#003135]/25 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-wider disabled:opacity-50"
                    >
                        {dismissing ? "Saving..." : "Got it, thanks!"}
                    </button>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
