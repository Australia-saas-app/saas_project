"use client";
import Chart from "chart.js/auto";
import React, { useEffect, useRef } from "react";
import { Inter } from "next/font/google";
import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "@/src/core/store/hooks";

const inter = Inter({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const TrafficByDeviceChart: React.FC = () => {
  const chartRef = useRef<Chart | null>(null);
  const token = useAppSelector(state => state.auth.token);

  const { data: chartData = [0, 0, 0, 0, 0, 0], isLoading } = useQuery({
    queryKey: ['admin-device-stats', token],
    queryFn: async () => {
      const res = await fetch('/admin/api/user-profile/activity/admin/device-stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch device stats');
      const json = await res.json();
      return json.data || [0, 0, 0, 0, 0, 0];
    },
    enabled: !!token,
    refetchInterval: 30000 // refresh every 30 seconds
  });

  useEffect(() => {
    if (isLoading) return;

    const ctx = document.getElementById("trafficByDeviceNew") as HTMLCanvasElement;
    if (!ctx) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const maxVal = Math.max(...chartData, 1);
    const yMax = maxVal <= 10 ? 10 : Math.ceil(maxVal * 1.2);

    const gradientPurple = ctx.getContext("2d")?.createLinearGradient(0, 0, 0, 400);
    gradientPurple?.addColorStop(0, "rgba(139, 92, 246, 1)"); // Purple 500
    gradientPurple?.addColorStop(1, "rgba(139, 92, 246, 0.4)");

    const gradientBlue = ctx.getContext("2d")?.createLinearGradient(0, 0, 0, 400);
    gradientBlue?.addColorStop(0, "rgba(59, 130, 246, 1)"); // Blue 500
    gradientBlue?.addColorStop(1, "rgba(59, 130, 246, 0.4)");

    const gradientTeal = ctx.getContext("2d")?.createLinearGradient(0, 0, 0, 400);
    gradientTeal?.addColorStop(0, "rgba(20, 184, 166, 1)"); // Teal 500
    gradientTeal?.addColorStop(1, "rgba(20, 184, 166, 0.4)");

    const gradientMint = ctx.getContext("2d")?.createLinearGradient(0, 0, 0, 400);
    gradientMint?.addColorStop(0, "rgba(52, 211, 153, 1)"); // Emerald 400
    gradientMint?.addColorStop(1, "rgba(52, 211, 153, 0.4)");

    const gradientGray = ctx.getContext("2d")?.createLinearGradient(0, 0, 0, 400);
    gradientGray?.addColorStop(0, "rgba(156, 163, 175, 1)"); // Gray 400
    gradientGray?.addColorStop(1, "rgba(156, 163, 175, 0.4)");

    const gradientOrange = ctx.getContext("2d")?.createLinearGradient(0, 0, 0, 400);
    gradientOrange?.addColorStop(0, "rgba(249, 115, 22, 1)"); // Orange 500
    gradientOrange?.addColorStop(1, "rgba(249, 115, 22, 0.4)");

    chartRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Linux", "Mac", "iOS", "Window", "Android", "Other"],
        datasets: [
          {
            label: "Traffic",
            data: chartData,
            backgroundColor: [
              gradientPurple as any,
              gradientTeal as any,
              gradientBlue as any,
              gradientMint as any,
              gradientOrange as any,
              gradientGray as any,
            ],
            borderRadius: 8,
            borderSkipped: false,
            barThickness: 20,
            maxBarThickness: 25,
            hoverBackgroundColor: [
              "rgba(139, 92, 246, 0.8)",
              "rgba(20, 184, 166, 0.8)",
              "rgba(59, 130, 246, 0.8)",
              "rgba(52, 211, 153, 0.8)",
              "rgba(249, 115, 22, 0.8)",
              "rgba(156, 163, 175, 0.8)",
            ],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 2000,
          easing: "easeOutElastic",
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.9)",
            titleColor: "#fff",
            bodyColor: "#e2e8f0",
            bodyFont: {
              size: 13,
              family: "Inter",
            },
            titleFont: {
              size: 14,
              family: "Inter",
              weight: "bold",
            },
            padding: 12,
            cornerRadius: 12,
            displayColors: true,
            boxPadding: 4,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            max: yMax,
            ticks: {
              stepSize: maxVal <= 10 ? 1 : Math.max(1, Math.ceil(yMax / 5)),
              callback: function (value) {
                const num = Number(value);
                if (num === 0) return "0";
                if (yMax <= 10) return String(num);
                if (num >= 1000) return `${num / 1000}K`;
                return String(num);
              },
              padding: 10,
              font: {
                family: "Inter",
                size: 11,
              },
              color: "#94a3b8", // slate-400
            },
            grid: {
              display: true,
              color: "rgba(203, 213, 225, 0.2)", // very light slate
              drawTicks: false,
            },
            border: {
              display: false,
            },
          },
          x: {
            grid: {
              display: false,
            },
            border: {
              display: false,
            },
            ticks: {
              padding: 10,
              font: {
                family: "Inter",
                size: 11,
                weight: "bold",
              },
              color: "#64748b", // slate-500
            },
          },
        },
        layout: {
          padding: {
            top: 20,
            bottom: 10,
            left: 0,
            right: 0,
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [chartData, isLoading]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-6 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className={`${inter.className} text-gray-900 dark:text-gray-100 text-lg font-bold tracking-tight`}>
          Traffic by Device
        </h2>
        <button className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors text-gray-400 hover:text-purple-600">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
        </button>
      </div>
      <div className="flex-1 min-h-[250px] relative w-full h-[300px]">
        <canvas id="trafficByDeviceNew"></canvas>
      </div>
    </div>
  );
};

export default TrafficByDeviceChart;
