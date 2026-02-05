"use client";

import { useState, useEffect } from "react";
import { X, Mail, Phone, User, Loader2, Save } from "lucide-react";
import { updateUserProfile } from "@/app/actions/user";
import { toast } from "sonner";
import { Profile } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";

interface EditUserSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    userToEdit: Profile | null;
}

export const EditUserSidebar = ({ isOpen, onClose, onSuccess, userToEdit }: EditUserSidebarProps) => {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (userToEdit) {
            setFullName(userToEdit.full_name || "");
            setEmail(userToEdit.email || "");
            setPhone(userToEdit.phone || "");
        }
    }, [userToEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userToEdit) return;
        setLoading(true);

        try {
            await updateUserProfile(userToEdit.id, {
                fullName,
                email,
                phone
            });
            toast.success("User profile updated successfully");
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Update failed:", error);
            // Display a cleaner error message if possible
            const logMsg = error?.message || "Unknown error occurred";
            toast.error("Failed to update profile", {
                description: logMsg
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[100] bg-[#0a1128]/10 cursor-pointer"
                    />

                    {/* Sidebar Drawer */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="fixed inset-y-0 right-0 z-[101] w-full max-w-md bg-white dark:bg-admin-dark-surface shadow-2xl border-l border-white/20 flex flex-col h-full"
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-[#f5f5f5] dark:border-admin-dark-border flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-[#171717] dark:text-admin-dark-text-primary">Edit Member</h3>
                                <p className="text-sm text-[#a3a3a3] mt-1">Update user details and permissions.</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors text-[#a3a3a3]"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        {/* Content Scrollable Area */}
                        <div className="flex-1 overflow-y-auto p-8">
                            <form id="edit-user-form" onSubmit={handleSubmit} className="space-y-8">
                                {/* Profile Avatar Preview (Visual Only for now) */}
                                <div className="flex justify-center">
                                    <div className="size-24 rounded-full bg-[#f5f5f5] dark:bg-admin-dark-bg flex items-center justify-center text-3xl font-bold text-[#171717] dark:text-admin-dark-text-primary border-4 border-white dark:border-admin-dark-surface shadow-lg">
                                        {(fullName || email || "?").charAt(0).toUpperCase()}
                                    </div>
                                </div>

                                {/* Name Input */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-[#171717] dark:text-admin-dark-text-primary uppercase tracking-widest pl-1">
                                        Full Name
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <User className="size-4 text-[#a3a3a3] group-focus-within:text-[#171717] dark:group-focus-within:text-white transition-colors" />
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            placeholder="John Doe"
                                            className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border pl-10 pr-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-[#0a1128] dark:focus:ring-white/20 outline-none transition-all text-[#171717] dark:text-admin-dark-text-primary"
                                        />
                                    </div>
                                </div>

                                {/* Email Input */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-[#171717] dark:text-admin-dark-text-primary uppercase tracking-widest pl-1">
                                        Email Address
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Mail className="size-4 text-[#a3a3a3] group-focus-within:text-[#171717] dark:group-focus-within:text-white transition-colors" />
                                        </div>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="colleague@example.com"
                                            className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border pl-10 pr-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-[#0a1128] dark:focus:ring-white/20 outline-none transition-all text-[#171717] dark:text-admin-dark-text-primary"
                                        />
                                    </div>
                                    <div className="pl-1 p-3 bg-amber-50 dark:bg-amber-500/10 rounded-lg border border-amber-100 dark:border-amber-500/20">
                                        <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium leading-relaxed">
                                            ⚠️ Changing the email address will update the user's login credentials. Depending on security settings, they may need to verify the new email.
                                        </p>
                                    </div>
                                </div>

                                {/* Phone Input */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-[#171717] dark:text-admin-dark-text-primary uppercase tracking-widest pl-1">
                                        Phone Number
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Phone className="size-4 text-[#a3a3a3] group-focus-within:text-[#171717] dark:group-focus-within:text-white transition-colors" />
                                        </div>
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="+1 234 567 890"
                                            className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border pl-10 pr-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-[#0a1128] dark:focus:ring-white/20 outline-none transition-all text-[#171717] dark:text-admin-dark-text-primary"
                                        />
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Footer / Actions */}
                        <div className="p-8 border-t border-[#f5f5f5] dark:border-admin-dark-border bg-[#fafafa]/50 dark:bg-admin-dark-bg/50 backdrop-blur-sm">
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-5 py-3 rounded-xl border border-gray-200 dark:border-admin-dark-border text-sm font-bold text-[#a3a3a3] hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    form="edit-user-form"
                                    disabled={loading || !email || !fullName}
                                    className="flex-[2] px-5 py-3 rounded-xl bg-[#171717] dark:bg-white text-white dark:text-black text-sm font-bold hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Save className="size-4" />
                                            Save Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
