"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

const Calendar = ({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: CalendarProps) => {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={`p-3 ${className}`}
            classNames={{
                root: `rdp m-0 relative`,
                months: "flex flex-col sm:flex-row space-y-0",
                month: "space-y-4 w-full",

                // Header & Navigation
                caption: "flex justify-center pt-1 relative items-center mb-4 w-full",
                caption_label: "text-base font-bold text-navy-950 capitalize font-sans tracking-wider z-0 text-center w-full block",
                nav: "absolute top-0 left-0 w-full h-10 flex items-center justify-between px-1 z-10",
                nav_button: "h-7 w-7 bg-transparent hover:bg-gray-50 border border-transparent hover:border-gray-200 p-0 rounded-md flex items-center justify-center transition-all opacity-60 hover:opacity-100 text-navy-900 pointer-events-auto",
                nav_button_previous: "",
                nav_button_next: "",

                // Table Structure (Flex Layout)
                // Table Structure (Flex Layout for V9 compatibility)
                table: "w-full border-collapse space-y-1",
                head_row: "flex",
                head_cell: "text-gray-400 rounded-md w-9 font-normal text-[0.7rem] uppercase tracking-widest text-center font-sans",
                row: "flex w-full mt-2",
                cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-transparent focus-within:relative focus-within:z-20",

                // V9 Specific mappings
                month_grid: "w-full border-collapse space-y-1",
                weekdays: "flex",
                weekday: "text-gray-400 rounded-md w-9 font-normal text-[0.7rem] uppercase tracking-widest text-center font-sans",
                week: "flex w-full mt-2",
                day: "h-9 w-9 p-0 font-medium aria-selected:opacity-100 rounded-[2px] hover:bg-[#F3F0EB] transition-all text-navy-900 font-sans text-sm flex items-center justify-center",
                day_button: "h-full w-full flex items-center justify-center bg-transparent hover:bg-transparent text-current font-normal", // V9 internal button

                // Day Styling (Legacy & fallback)
                day_selected: "bg-[#C5A059] !text-white hover:bg-[#b08d4b] shadow-sm font-semibold rounded-[2px]",
                day_today: "text-[#C5A059] font-bold after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-[#C5A059] after:rounded-full",
                day_outside: "text-gray-300 opacity-20",
                day_disabled: "text-gray-200 opacity-10 cursor-not-allowed",
                day_hidden: "invisible",

                // Range Selection
                range_start: "bg-[#C5A059] text-white rounded-l-md hover:bg-[#b08d4b]",
                range_end: "bg-[#C5A059] text-white rounded-r-md hover:bg-[#b08d4b]",
                range_middle: "bg-[#f4f0e6] text-[#171717] hover:bg-[#ece6d6] rounded-none",

                ...classNames,
            }}
            components={{
                Chevron: ({ orientation }) => orientation === "left" ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />,
            }}
            {...props}
        />
    );
};
Calendar.displayName = "Calendar";

export { Calendar };
