"use client"

import { useState } from "react"
import { Monitor, Smartphone, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

const DEMO_DEVICES = [
  {
    id: "1",
    name: "Windows PC",
    detail: "Chrome · Windows 11",
    location: "Dhaka, BD",
    ip: "103.112.xx.xx",
    lastActive: "Today 10:30 AM",
    current: true,
    icon: Monitor,
  },
  {
    id: "2",
    name: "iPhone 13",
    detail: "Safari · iOS 17",
    location: "Dhaka, BD",
    ip: "103.112.xx.xx",
    lastActive: "Yesterday 08:15 PM",
    current: false,
    icon: Smartphone,
  },
  {
    id: "3",
    name: "MacBook Pro",
    detail: "Chrome · macOS",
    location: "Chittagong, BD",
    ip: "114.130.xx.xx",
    lastActive: "2 days ago",
    current: false,
    icon: Monitor,
  },
]

export default function DeviceManagementLayout() {
  const [devices, setDevices] = useState(DEMO_DEVICES)

  return (
    <div className="mt-4 md:mt-8">
      <div className="w-full max-w-3xl rounded-2xl bg-card p-6 shadow-sm md:p-7 border border-border">
        <h2 className="mb-4 text-base font-bold text-card-foreground">Device Management</h2>
        <p className="mb-6 text-sm text-muted-foreground max-w-xl">
          Review the devices currently signed into your account. Remove any devices you don't recognize.
        </p>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="pb-2 font-semibold">Device</th>
              <th className="pb-2 font-semibold">Location</th>
              <th className="pb-2 font-semibold">Last Active</th>
              <th className="pb-2 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {devices.map((d) => {
              const Icon = d.icon
              return (
                <tr key={d.id} className="text-card-foreground">
                  <td className="py-3 pr-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-semibold text-card-foreground">{d.name}</p>
                        <p className="text-[11px] text-muted-foreground">{d.detail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-2">
                    <p>{d.location}</p>
                    <p className="text-[11px] text-muted-foreground">{d.ip}</p>
                  </td>
                  <td className="py-3 pr-2">{d.lastActive}</td>
                  <td className="py-3">
                    {d.current ? (
                      <span className="rounded-full border border-emerald-200 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                        Current
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="rounded-lg border border-rose-200 px-2.5 py-1 text-[10px] font-semibold text-rose-600 hover:bg-rose-50"
                        onClick={() => {
                          setDevices((prev) => prev.filter((x) => x.id !== d.id))
                          toast.success("Device removed")
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  )
}
