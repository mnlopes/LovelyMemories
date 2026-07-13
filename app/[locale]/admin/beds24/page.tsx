import { isBeds24Enabled } from "@/lib/beds24/client";
import { getBeds24Status, getBeds24Properties, getBeds24Bookings, getBeds24Messages } from "@/app/actions/beds24";
import Beds24Dashboard from "./components/Beds24Dashboard";

export const dynamic = "force-dynamic";

export default async function AdminBeds24Page() {
    if (!isBeds24Enabled()) {
        return (
            <div className="space-y-4 pb-20">
                <h1 className="text-3xl font-bold tracking-tight dark:text-admin-dark-text-primary">Beds24 PMS Lab</h1>
                <div className="bg-white dark:bg-admin-dark-surface p-6 rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border shadow-sm">
                    <p className="font-medium">Beds24 está desativado neste ambiente.</p>
                    <p className="text-[#a3a3a3] mt-2 text-sm">
                        Sem <code>BEDS24_REFRESH_TOKEN</code> configurado neste ambiente. Em produção as credenciais estão no scope Production (acesso só super_admin).
                    </p>
                </div>
            </div>
        );
    }

    const [status, properties, bookings, messages] = await Promise.all([
        getBeds24Status(),
        getBeds24Properties(),
        getBeds24Bookings(),
        getBeds24Messages(),
    ]);

    return (
        <Beds24Dashboard
            status={status}
            properties={properties}
            bookings={bookings}
            messages={messages}
        />
    );
}
