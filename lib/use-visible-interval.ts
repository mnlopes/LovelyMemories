"use client";

import { useEffect, useRef } from "react";

/**
 * Like setInterval, but paused while the browser tab is hidden, and run once as soon as it
 * becomes visible again (so the screen is fresh when someone comes back to it).
 *
 * Backoffice screens poll Supabase; a tab left open in the background used to keep polling
 * all day, and every request is a log line on the Supabase plan.
 */
export function useVisibleInterval(callback: () => void, ms: number, enabled = true) {
    const saved = useRef(callback);

    useEffect(() => {
        saved.current = callback;
    }, [callback]);

    useEffect(() => {
        if (!enabled) return;
        let id: ReturnType<typeof setInterval> | null = null;
        const start = () => {
            if (id === null) id = setInterval(() => saved.current(), ms);
        };
        const stop = () => {
            if (id !== null) {
                clearInterval(id);
                id = null;
            }
        };
        const onVisibility = () => {
            if (document.hidden) {
                stop();
            } else {
                saved.current();
                start();
            }
        };
        if (!document.hidden) start();
        document.addEventListener("visibilitychange", onVisibility);
        return () => {
            stop();
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, [ms, enabled]);
}
