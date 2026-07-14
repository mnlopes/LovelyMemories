import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { beds24Request } from "../lib/beds24/client";

// Virtudes One (cobaia): roomId 704840
(async () => {
    const res = await beds24Request("GET", "/inventory/rooms/calendar", {
        query: {
            roomId: 704840,
            startDate: "2026-09-01",
            endDate: "2026-09-10",
            includePrices: true,
            includeMinStay: true,
            includeNumAvail: true,
        },
        context: "action",
    });
    console.log(JSON.stringify(res, null, 2));

    const { getRoomCalendar } = await import("../lib/beds24/calendar");
    const days = await getRoomCalendar(704840, "2026-09-01", "2026-09-05");
    console.log("parsed days:", days);
})();
