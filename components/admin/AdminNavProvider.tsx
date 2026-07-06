"use client";

import { createContext, useContext, useState } from "react";

interface AdminNavContextValue {
    mobileOpen: boolean;
    setMobileOpen: (open: boolean) => void;
}

const AdminNavContext = createContext<AdminNavContextValue | null>(null);

export function AdminNavProvider({ children }: { children: React.ReactNode }) {
    const [mobileOpen, setMobileOpen] = useState(false);
    return (
        <AdminNavContext.Provider value={{ mobileOpen, setMobileOpen }}>
            {children}
        </AdminNavContext.Provider>
    );
}

export function useAdminNav(): AdminNavContextValue {
    const ctx = useContext(AdminNavContext);
    // Fallback keeps components usable outside the provider (e.g. isolated tests).
    return ctx ?? { mobileOpen: false, setMobileOpen: () => {} };
}
