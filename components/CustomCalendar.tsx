"use client";

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    isToday,
    isBefore
} from 'date-fns';

interface CustomCalendarProps {
    value?: Date;
    onChange?: (date: Date) => void;
    minDate?: Date;
}

export const CustomCalendar: React.FC<CustomCalendarProps> = ({
    value,
    onChange,
    minDate = new Date()
}) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const renderHeader = () => {
        return (
            <div className="relative flex items-center justify-center mb-4 w-full">
                <button
                    onClick={prevMonth}
                    disabled={isBefore(currentMonth, startOfMonth(minDate))}
                    className={`absolute left-0 p-1 hover:bg-gray-50 rounded-md transition-colors ${isBefore(currentMonth, startOfMonth(minDate)) ? 'opacity-20 cursor-not-allowed' : 'text-navy-900'}`}
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                <span className="text-base font-bold text-navy-950 font-sans tracking-wider">
                    {format(currentMonth, 'MMMM yyyy')}
                </span>

                <button
                    onClick={nextMonth}
                    className="absolute right-0 p-1 hover:bg-gray-50 rounded-md transition-colors text-navy-900"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        );
    };

    const renderDaysHeader = () => {
        const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
        return (
            <div className="grid grid-cols-7 mb-2">
                {days.map(day => (
                    <div key={day} className="text-center text-[0.7rem] font-normal text-gray-400 uppercase tracking-widest font-sans">
                        {day}
                    </div>
                ))}
            </div>
        );
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

        const dateFormat = "d";
        const rows = [];
        let days = [];
        let day = startDate;
        let formattedDate = "";

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                formattedDate = format(day, dateFormat);
                const cloneDay = day;

                const isDisabled = isBefore(day, new Date(new Date().setHours(0, 0, 0, 0)));
                const isSelected = value ? isSameDay(day, value) : false;
                const isCurrentMonth = isSameMonth(day, monthStart);

                days.push(
                    <div
                        key={day.toString()}
                        className={`
                            h-9 w-9 flex items-center justify-center text-sm font-sans cursor-pointer transition-all rounded-[2px] margin-0
                            ${!isCurrentMonth ? 'text-gray-300 opacity-0 pointer-events-none' : ''} 
                            ${isDisabled ? 'text-gray-200 cursor-not-allowed' : 'hover:bg-[#F3F0EB] text-navy-900'}
                            ${isSelected ? '!bg-[#C5A059] !text-white hover:!bg-[#b08d4b] font-semibold shadow-sm' : ''}
                            ${isToday(day) && !isSelected ? "text-[#C5A059] font-bold" : ""}
                        `}
                        onClick={() => {
                            if (!isDisabled && isCurrentMonth && onChange) {
                                onChange(cloneDay);
                            }
                        }}
                    >
                        <span className="relative">
                            {formattedDate}
                            {isToday(day) && !isSelected && (
                                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0.5 h-0.5 bg-[#C5A059] rounded-full"></span>
                            )}
                        </span>
                    </div>
                );
                day = UtilAddDays(day, 1);
            }
            rows.push(
                <div key={day.toString()} className="grid grid-cols-7 gap-y-1">
                    {days}
                </div>
            );
            days = [];
        }
        // Simplified rendering: Just one grid wrapper
        const allDays = eachDayOfInterval({ start: startDate, end: endDate });

        return (
            <div className="grid grid-cols-7 gap-y-1 w-full">
                {allDays.map((date, idx) => {
                    const isDisabled = isBefore(date, new Date(new Date().setHours(0, 0, 0, 0)));
                    const isSelected = value ? isSameDay(date, value) : false;
                    const isCurrentMonth = isSameMonth(date, monthStart);

                    if (!isCurrentMonth) {
                        return <div key={idx} className="h-9 w-9"></div>; // Spacer
                    }

                    return (
                        <div
                            key={idx}
                            onClick={() => {
                                if (!isDisabled && onChange) onChange(date);
                            }}
                            className={`
                                h-9 w-9 flex items-center justify-center text-sm font-sans transition-all rounded-[2px]
                                ${isDisabled ? 'text-gray-200 cursor-not-allowed' : 'cursor-pointer hover:bg-[#F3F0EB] text-navy-900'}
                                ${isSelected ? '!bg-[#C5A059] !text-white hover:!bg-[#b08d4b] font-semibold shadow-sm' : ''}
                                ${isToday(date) && !isSelected ? "text-[#C5A059] font-bold" : ""}
                            `}
                        >
                            <span className="relative flex flex-col items-center">
                                {format(date, 'd')}
                                {isToday(date) && !isSelected && (
                                    <span className="absolute -bottom-1 w-0.5 h-0.5 bg-[#C5A059] rounded-full"></span>
                                )}
                            </span>
                        </div>
                    );
                })}
            </div>
        )
    };

    return (
        <div className="w-full p-2 bg-white select-none">
            {renderHeader()}
            {renderDaysHeader()}
            {renderCells()}
        </div>
    );
};

// Helper simples para evitar dependencias
function UtilAddDays(date: Date, days: number) {
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}
