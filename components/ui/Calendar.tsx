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
                nav: "absolute top-0 left-0 w-full h-10 flex items-center justify-between px-1 pointer-events-none z-10",
                nav_button: "h-7 w-7 bg-transparent hover:bg-gray-50 border border-transparent hover:border-gray-200 p-0 rounded-md flex items-center justify-center transition-all opacity-60 hover:opacity-100 text-navy-900 pointer-events-auto",
                nav_button_previous: "",
                nav_button_next: "",

                // Table Structure (Flex Layout)
                table: "w-full border-collapse space-y-1",
                head_row: "flex w-full justify-between mb-2",
                head_cell: "text-gray-400 rounded-md w-9 font-normal text-[0.7rem] uppercase tracking-widest text-center font-sans",
                row: "flex w-full mt-1 justify-between",
                cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-transparent focus-within:relative focus-within:z-20",

                // Day Styling
                day: "h-9 w-9 p-0 font-medium aria-selected:opacity-100 rounded-[2px] hover:bg-[#F3F0EB] transition-all text-navy-900 font-sans text-sm flex items-center justify-center",
                day_selected: "bg-[#C5A059] !text-white hover:bg-[#b08d4b] shadow-sm font-semibold rounded-[2px]",
                day_today: "text-[#C5A059] font-bold after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-[#C5A059] after:rounded-full",
                day_outside: "text-gray-300 opacity-20",
                day_disabled: "text-gray-200 opacity-10 cursor-not-allowed",
                day_hidden: "invisible",

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
