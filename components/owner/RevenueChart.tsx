"use client";

import { useTranslations, useLocale } from 'next-intl';
import {
    BarChart,
    Bar,
    XAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    YAxis,
    AreaChart,
    Area
} from 'recharts';
import { motion } from 'framer-motion';
import { useState, useMemo } from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';

interface DataPoint {
    label: string;
    value: number;
    date: string;
}

interface RevenueChartProps {
    data: DataPoint[];
    height?: number;
}

type TimeRange = '3M' | '6M' | '12M' | 'YTD';
type ChartType = 'bar' | 'area';

export function RevenueChart({ data, height = 350 }: RevenueChartProps) {
    const t = useTranslations('RevenueChart');
    const locale = useLocale();
    const [timeRange, setTimeRange] = useState<TimeRange>('6M');
    const [chartType, setChartType] = useState<ChartType>('bar');

    // Formatting for currency
    const formatCurrency = (value: number) =>
        new Intl.NumberFormat(locale === 'pt' ? 'pt-PT' : 'en-US', { style: 'currency', currency: 'EUR' }).format(value);

    // Filter and Localize Data
    const filteredData = useMemo(() => {
        if (!data || data.length === 0) return [];

        let subset = data;
        switch (timeRange) {
            case '3M':
                subset = data.slice(-3);
                break;
            case '6M':
                subset = data.slice(-6);
                break;
            case '12M':
                subset = data;
                break;
            case 'YTD':
                const currentYear = new Date().getFullYear();
                subset = data.filter(d => new Date(d.date).getFullYear() === currentYear);
                break;
            default:
                subset = data.slice(-6);
        }

        // Localize labels based on the date
        return subset.map(item => ({
            ...item,
            label: new Intl.DateTimeFormat(locale === 'pt' ? 'pt-PT' : 'en-US', { month: 'short' }).format(new Date(item.date))
        }));
    }, [data, timeRange, locale]);

    // Custom Tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[#1A1A1A] p-3 rounded-xl border border-white/10 shadow-xl min-w-[120px]">
                    <p className="text-white/50 text-[10px] uppercase tracking-widest font-bold mb-1">{label}</p>
                    <p className="text-white font-playfair text-lg font-bold">
                        {formatCurrency(payload[0].value)}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white dark:bg-admin-dark-surface p-6 rounded-3xl border border-[#f5f5f5] dark:border-admin-dark-border shadow-sm h-full flex flex-col"
        >
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <div>
                    <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary">
                        {t('title')}
                    </h3>
                    <p className="text-sm text-[#a3a3a3]">{t('subtitle')}</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Chart Type Toggle */}
                    <div className="flex bg-[#f5f5f5] dark:bg-admin-dark-bg/50 p-1 rounded-full">
                        <button
                            onClick={() => setChartType('bar')}
                            className={`p-1.5 rounded-full transition-all ${chartType === 'bar'
                                ? 'bg-white dark:bg-admin-dark-surface text-[#0A1128] dark:text-white shadow-sm'
                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                }`}
                            title="Bar Chart"
                        >
                            <BarChart3 size={14} strokeWidth={2.5} />
                        </button>
                        <button
                            onClick={() => setChartType('area')}
                            className={`p-1.5 rounded-full transition-all ${chartType === 'area'
                                ? 'bg-white dark:bg-admin-dark-surface text-[#0A1128] dark:text-white shadow-sm'
                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                }`}
                            title="Line Chart"
                        >
                            <TrendingUp size={14} strokeWidth={2.5} />
                        </button>
                    </div>

                    {/* Time Range Selector */}
                    <div className="flex bg-[#f5f5f5] dark:bg-admin-dark-bg/50 p-1 rounded-full">
                        {(['3M', '6M', '12M', 'YTD'] as TimeRange[]).map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${timeRange === range
                                    ? 'bg-white dark:bg-admin-dark-surface text-[#0A1128] dark:text-white shadow-sm'
                                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                    }`}
                            >
                                {range}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 w-full min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'bar' ? (
                        <BarChart
                            data={filteredData}
                            margin={{ top: 10, right: 10, left: 0, bottom: 30 }} // Increased bottom margin
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" opacity={0.4} />
                            <XAxis
                                dataKey="label"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#A3A3A3', fontSize: 12, fontWeight: 600 }}
                                dy={10}
                                interval={0}
                            />
                            <YAxis hide={true} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(197, 160, 89, 0.1)' }} />
                            <Bar
                                dataKey="value"
                                fill="#C5A059"
                                radius={[6, 6, 0, 0]}
                                barSize={40}
                                animationDuration={800}
                            />
                        </BarChart>
                    ) : (
                        <AreaChart
                            data={filteredData}
                            margin={{ top: 10, right: 20, left: 20, bottom: 30 }} // Increased bottom margin & added horizontal for labels
                        >
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#C5A059" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#C5A059" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" opacity={0.4} />
                            <XAxis
                                dataKey="label"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#A3A3A3', fontSize: 12, fontWeight: 600 }}
                                dy={10}
                                interval={0}
                            />
                            <YAxis hide={true} />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#C5A059', strokeWidth: 1, strokeDasharray: '4 4' }} />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#C5A059"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorRevenue)"
                                activeDot={{ r: 6, strokeWidth: 0, fill: '#C5A059' }}
                                animationDuration={800}
                            />
                        </AreaChart>
                    )}
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
}
