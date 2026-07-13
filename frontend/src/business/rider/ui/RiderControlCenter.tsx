"use client";

import React, { useState, useEffect } from "react";

export function RiderControlCenter() {
  const [isOnline, setIsOnline] = useState(false);
  const [incomingRide, setIncomingRide] = useState<null | any>(null);
  const [rideStatus, setRideStatus] = useState<"idle" | "accepted" | "picked_up" | "completed">("idle");

  // Simulate an incoming ride when the rider goes online
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isOnline && rideStatus === "idle") {
      timeout = setTimeout(() => {
        setIncomingRide({
          id: "RIDE-992",
          pickup: "123 Main St",
          dropoff: "456 Market St",
          distance: "4.2 miles",
          estEarnings: "$12.50",
          customer: "Alex J.",
          rating: 4.8
        });
      }, 3000);
    } else {
      setIncomingRide(null);
    }
    return () => clearTimeout(timeout);
  }, [isOnline, rideStatus]);

  const handleAccept = () => {
    setIncomingRide(null);
    setRideStatus("accepted");
  };

  const handleDecline = () => {
    setIncomingRide(null);
    // In a real app, it would re-route to another rider
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header & Online Toggle */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Ride Radar</h2>
          <p className="text-slate-600">Go online to start receiving ride requests in your area.</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
          <span className={`text-sm font-bold ${isOnline ? 'text-green-600' : 'text-slate-400'}`}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
          <button 
            onClick={() => setIsOnline(!isOnline)}
            className={`w-16 h-8 rounded-full relative transition-colors shadow-inner ${isOnline ? 'bg-green-500' : 'bg-slate-200'}`}
          >
            <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-transform shadow-md ${isOnline ? 'left-9' : 'left-1'}`} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Earnings Quick View */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Today's Earnings</p>
          <h3 className="text-3xl font-bold text-slate-900 mb-4">$84.50</h3>
          <div className="flex justify-between text-sm text-slate-500">
            <span>Rides: 6</span>
            <span>Online: 4h 12m</span>
          </div>
        </div>

        {/* Map / Radar Area */}
        <div className="md:col-span-2 bg-slate-100 border border-slate-200 rounded-3xl relative overflow-hidden min-h-[400px] flex items-center justify-center shadow-inner">
          {/* Map Simulation */}
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "url('data:image/svg+xml;utf8,<svg width=\"20\" height=\"20\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M0 0h20v20H0z\" fill=\"none\"/><path d=\"M0 10h20M10 0v20\" stroke=\"%23cbd5e1\" stroke-width=\"0.5\"/></svg>')", backgroundSize: '40px 40px' }} />
          
          {!isOnline && (
            <div className="relative z-10 text-center">
              <div className="w-16 h-16 rounded-full bg-white shadow-sm mx-auto mb-4 flex items-center justify-center text-slate-400">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              </div>
              <p className="text-slate-500 font-medium bg-white/50 px-4 py-1 rounded-full backdrop-blur-sm inline-block border border-slate-200 shadow-sm">You are offline. Go online to receive rides.</p>
            </div>
          )}

          {isOnline && rideStatus === "idle" && !incomingRide && (
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-32 h-32 rounded-full border-2 border-green-500/50 animate-ping absolute" />
              <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500 flex items-center justify-center text-green-600 relative z-10">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </div>
              <p className="mt-8 text-green-700 font-medium bg-white/80 border border-green-200 px-4 py-1 rounded-full backdrop-blur-md shadow-sm">Scanning for rides...</p>
            </div>
          )}

          {/* Incoming Ride Popup */}
          {incomingRide && (
            <div className="absolute inset-x-4 bottom-4 md:inset-x-auto md:w-[350px] bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-8 z-20">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">New Request</p>
                  <h3 className="text-2xl font-bold text-slate-900">{incomingRide.estEarnings}</h3>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{incomingRide.distance}</p>
                  <p className="text-xs text-slate-500">12 mins</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex gap-3">
                  <div className="mt-1 w-3 h-3 rounded-full bg-blue-500 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">PICKUP</p>
                    <p className="text-sm font-bold text-black">{incomingRide.pickup}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="mt-1 w-3 h-3 rounded-none bg-purple-500 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">DROPOFF</p>
                    <p className="text-sm font-bold text-black">{incomingRide.dropoff}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={handleDecline} className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">
                  Decline
                </button>
                <button onClick={handleAccept} className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors shadow-lg">
                  Accept Ride
                </button>
              </div>
            </div>
          )}

          {/* Active Ride UI */}
          {rideStatus !== "idle" && (
            <div className="absolute inset-x-4 bottom-4 md:inset-x-auto md:w-[350px] bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl z-20">
              <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-100">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">AJ</div>
                <div>
                  <p className="font-bold text-slate-900">Alex J.</p>
                  <p className="text-sm text-slate-500">★ 4.8</p>
                </div>
                <button className="ml-auto w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                </button>
              </div>

              {rideStatus === "accepted" && (
                <button onClick={() => setRideStatus("picked_up")} className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-colors">
                  Confirm Pickup
                </button>
              )}
              {rideStatus === "picked_up" && (
                <button onClick={() => setRideStatus("completed")} className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors">
                  Complete Ride
                </button>
              )}
              {rideStatus === "completed" && (
                <button onClick={() => setRideStatus("idle")} className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold rounded-xl transition-colors">
                  Find Next Ride
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
