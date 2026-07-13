"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export function RideBookingMap() {
  const router = useRouter();
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [rideStatus, setRideStatus] = useState<"idle" | "searching" | "found">("idle");

  const handleBookRide = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickup || !dropoff) return;
    
    setIsSearching(true);
    setRideStatus("searching");

    // Simulate searching for a rider
    setTimeout(() => {
      setIsSearching(false);
      setRideStatus("found");
      alert("Ride booked successfully! A rider has accepted your request. (Simulated)");
    }, 2500);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[80vh] animate-in fade-in duration-500">
      
      {/* Left Column: Booking Form */}
      <div className="w-full lg:w-[400px] flex flex-col gap-6">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px] pointer-events-none" />
          
          <h2 className="text-2xl font-bold text-white mb-6 relative z-10">Book a Ride</h2>
          
          <form onSubmit={handleBookRide} className="relative z-10 space-y-4">
            <div className="relative">
              <div className="absolute top-4 left-4 w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
              <input 
                type="text" 
                required
                placeholder="Pickup Location"
                className="w-full pl-10 pr-4 py-3 bg-[#131315] border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500/50 text-white outline-none"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
              />
            </div>

            <div className="relative ml-[1.1rem] border-l-2 border-dashed border-white/10 h-4 my-1" />

            <div className="relative">
              <div className="absolute top-4 left-4 w-3 h-3 rounded-none bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
              <input 
                type="text" 
                required
                placeholder="Where to?"
                className="w-full pl-10 pr-4 py-3 bg-[#131315] border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500/50 text-white outline-none"
                value={dropoff}
                onChange={(e) => setDropoff(e.target.value)}
              />
            </div>

            {/* Vehicle Options */}
            <div className="pt-4 grid grid-cols-2 gap-3">
              <label className="cursor-pointer">
                <input type="radio" name="vehicle" className="peer sr-only" defaultChecked />
                <div className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 peer-checked:border-blue-500 peer-checked:bg-blue-500/10 transition-colors text-center">
                  <div className="text-2xl mb-1">🏍️</div>
                  <div className="font-medium text-white text-sm">Bike</div>
                  <div className="text-xs text-gray-400">1 min away</div>
                </div>
              </label>
              <label className="cursor-pointer">
                <input type="radio" name="vehicle" className="peer sr-only" />
                <div className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 peer-checked:border-blue-500 peer-checked:bg-blue-500/10 transition-colors text-center">
                  <div className="text-2xl mb-1">🚗</div>
                  <div className="font-medium text-white text-sm">Car</div>
                  <div className="text-xs text-gray-400">4 mins away</div>
                </div>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSearching || rideStatus === "found"}
              className="w-full py-4 mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98] disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {isSearching ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Finding your Rider...
                </>
              ) : rideStatus === "found" ? (
                "Rider on the way!"
              ) : (
                "Request Ride"
              )}
            </button>
          </form>
        </div>

        {/* Dynamic Status Widget */}
        {rideStatus === "found" && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-3xl p-6 animate-in slide-in-from-bottom-4">
            <h3 className="text-green-400 font-bold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              Rider Accepted!
            </h3>
            <div className="flex items-center gap-4 bg-black/20 p-4 rounded-xl border border-white/5">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center font-bold text-white">MK</div>
              <div>
                <p className="font-bold text-white">Michael K.</p>
                <p className="text-sm text-gray-400">★ 4.9 • Honda Civic (Black)</p>
                <p className="text-xs text-blue-400 font-mono mt-1">Plate: XYZ-9876</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Map Simulation */}
      <div className="flex-1 bg-[#131315] border border-white/10 rounded-3xl relative overflow-hidden min-h-[400px]">
        {/* Simulate a Map Background */}
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "url('data:image/svg+xml;utf8,<svg width=\"20\" height=\"20\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M0 0h20v20H0z\" fill=\"none\"/><path d=\"M0 10h20M10 0v20\" stroke=\"%23ffffff\" stroke-width=\"0.5\"/></svg>')", backgroundSize: '40px 40px' }} />
        
        {/* Route Line Simulation */}
        {pickup && dropoff && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-[3px] border-dashed border-blue-500/50 rounded-full animate-spin-slow pointer-events-none" style={{ animationDuration: '30s' }} />
        )}

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center animate-pulse">
            <div className="w-4 h-4 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,1)]" />
          </div>
          <p className="mt-4 font-mono text-sm text-blue-400 font-medium bg-[#131315]/80 px-3 py-1 rounded-md backdrop-blur-md">
            {rideStatus === "searching" ? "Searching nearby riders..." : "Map View"}
          </p>
        </div>
      </div>
    </div>
  );
}
