// public/cohost-sw.js — push do Co-Host (registado a partir de /admin/cohost)
self.addEventListener("push", (event) => {
    let data = { title: "Co-Host", body: "", url: "/en/admin/cohost" };
    try { data = { ...data, ...event.data.json() }; } catch { /* payload vazio */ }
    event.waitUntil(self.registration.showNotification(data.title, {
        body: data.body,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data: { url: data.url },
    }));
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const url = event.notification.data?.url || "/en/admin/cohost";
    event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
        // Reaproveita uma janela do Co-Host já aberta, mas navega-a para a decisão certa.
        for (const client of list) {
            if (client.url.includes("/admin/cohost")) {
                if ("navigate" in client) {
                    return client.navigate(url).then((c) => (c || client).focus());
                }
                return client.focus();
            }
        }
        return clients.openWindow(url);
    }));
});
