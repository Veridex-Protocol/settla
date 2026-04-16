"use client";

import React from "react";
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";

// Color palette matching Sera design
const COLORS = {
    emerald: "#10b981",
    emeraldLight: "#34d399",
    cyan: "#06b6d4",
    cyanLight: "#22d3ee",
    red: "#ef4444",
    redLight: "#f87171",
    amber: "#f59e0b",
    purple: "#8b5cf6",
    blue: "#3b82f6",
    zinc: "#71717a",
};

const PIE_COLORS = [COLORS.emerald, COLORS.cyan, COLORS.purple, COLORS.amber, COLORS.blue];

// Custom tooltip for dark theme
const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
}) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 shadow-xl">
                <p className="text-zinc-300 text-sm font-medium mb-1">{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} className="text-sm" style={{ color: entry.color }}>
                        {entry.name}: ${entry.value.toLocaleString()}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

// Revenue chart with area
interface RevenueChartProps {
    data: Array<{ month: string; inflow: number; outflow: number }>;
    height?: number;
}

export function RevenueAreaChart({ data, height = 350 }: RevenueChartProps) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <AreaChart
                data={data}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
                <defs>
                    <linearGradient id="inflowGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.emerald} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.emerald} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="outflowGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.red} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.red} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#71717a", fontSize: 12 }}
                    dy={10}
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#71717a", fontSize: 12 }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    dx={-10}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                    type="monotone"
                    dataKey="inflow"
                    name="Revenue"
                    stroke={COLORS.emerald}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#inflowGradient)"
                    animationDuration={1000}
                />
                <Area
                    type="monotone"
                    dataKey="outflow"
                    name="Expenses"
                    stroke={COLORS.red}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#outflowGradient)"
                    animationDuration={1000}
                    animationBegin={200}
                />
                <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ paddingBottom: 20 }}
                    formatter={(value) => <span className="text-zinc-400 text-sm">{value}</span>}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}

// Bar chart for revenue comparison
export function RevenueBarChart({ data, height = 350 }: RevenueChartProps) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <BarChart
                data={data}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                barCategoryGap="20%"
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#71717a", fontSize: 12 }}
                    dy={10}
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#71717a", fontSize: 12 }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    dx={-10}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                    dataKey="inflow"
                    name="Revenue"
                    fill={COLORS.emerald}
                    radius={[4, 4, 0, 0]}
                    animationDuration={800}
                />
                <Bar
                    dataKey="outflow"
                    name="Expenses"
                    fill={COLORS.red}
                    radius={[4, 4, 0, 0]}
                    animationDuration={800}
                    animationBegin={200}
                />
                <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ paddingBottom: 20 }}
                    formatter={(value) => <span className="text-zinc-400 text-sm">{value}</span>}
                />
            </BarChart>
        </ResponsiveContainer>
    );
}

// Line chart for trends
interface TrendChartProps {
    data: Array<{ month: string; value: number }>;
    height?: number;
    color?: string;
}

export function TrendLineChart({ data, height = 200, color = COLORS.emerald }: TrendChartProps) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <LineChart
                data={data}
                margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
            >
                <defs>
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#71717a", fontSize: 11 }}
                />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Line
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: color, stroke: "#18181b", strokeWidth: 2 }}
                    animationDuration={1000}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}

// Donut/Pie chart for distribution
interface DonutChartProps {
    data: Array<{ name: string; value: number; color?: string }>;
    height?: number;
}

export function DonutChart({ data, height = 250 }: DonutChartProps) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    animationDuration={800}
                >
                    {data.map((entry, index) => (
                        <Cell
                            key={`cell-${index}`}
                            fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]}
                            stroke="transparent"
                        />
                    ))}
                </Pie>
                <Tooltip
                    content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                            const data = payload[0];
                            return (
                                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 shadow-xl">
                                    <p className="text-white text-sm font-medium">{data.name}</p>
                                    <p className="text-emerald-400 text-sm">${Number(data.value).toLocaleString()}</p>
                                </div>
                            );
                        }
                        return null;
                    }}
                />
                <Legend
                    verticalAlign="bottom"
                    align="center"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span className="text-zinc-400 text-sm ml-1">{value}</span>}
                />
            </PieChart>
        </ResponsiveContainer>
    );
}

// Sparkline for inline mini charts
interface SparklineProps {
    data: number[];
    width?: number;
    height?: number;
    color?: string;
}

export function Sparkline({ data, width = 100, height = 30, color = COLORS.emerald }: SparklineProps) {
    const chartData = data.map((value, index) => ({ index, value }));

    return (
        <ResponsiveContainer width={width} height={height}>
            <LineChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                <Line
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={1.5}
                    dot={false}
                    animationDuration={500}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}

// Export colors for use in other components
export { COLORS };
