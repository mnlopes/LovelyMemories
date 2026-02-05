"use client";

import { ActivityTimeline } from "@/components/admin/ActivityTimeline";

export default function ActivityLogPage() {
    return (
        <div className="container mx-auto p-6 max-w-5xl">
            <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Activity Log</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                    A chronological record of system events and user actions.
                    Visibility is restricted based on your administrative privileges.
                </p>
            </div>

            <div className="bg-white dark:bg-admin-dark-surface rounded-xl border border-gray-200 dark:border-admin-dark-border p-6 shadow-sm">
                <ActivityTimeline limit={50} />
            </div>
        </div>
    );
}
