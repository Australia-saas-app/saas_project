"use client";

import React, { useState } from "react";

export function BusinessDiscovery() {
  const [isInviting, setIsInviting] = useState<string | null>(null);

  const businesses = [
    {
      id: "BUS-001",
      name: "CreativeTech Ltd",
      category: "Design",
      rating: 4.9,
      reviews: 124,
      hourlyRate: 50,
      successRate: "98%",
      skills: ["Figma", "React", "Next.js", "UI/UX"],
    },
    {
      id: "BUS-002",
      name: "AppDev Pros",
      category: "Engineering",
      rating: 4.7,
      reviews: 89,
      hourlyRate: 85,
      successRate: "95%",
      skills: ["Flutter", "React Native", "Node.js", "AWS"],
    },
    {
      id: "BUS-003",
      name: "PixelPerfect Agency",
      category: "Design",
      rating: 4.8,
      reviews: 210,
      hourlyRate: 45,
      successRate: "99%",
      skills: ["Photoshop", "Illustrator", "Branding", "Web Design"],
    }
  ];

  const handleInvite = (id: string, name: string) => {
    setIsInviting(id);
    setTimeout(() => {
      setIsInviting(null);
      alert(`Successfully sent project invite to ${name}!`);
    }, 1200);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Discover Businesses</h2>
          <p className="text-gray-400">Find top-rated businesses, compare reviews, and invite them to your project.</p>
        </div>
        
        {/* Search & Filter Bar */}
        <div className="flex gap-3 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="Search skills or names..." 
            className="w-full md:w-64 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500/50 text-white outline-none"
          />
          <select className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white outline-none appearance-none cursor-pointer">
            <option value="">All Categories</option>
            <option value="Design">Design</option>
            <option value="Engineering">Engineering</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {businesses.map((business) => (
          <div key={business.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col h-full hover:border-white/20 transition-colors relative overflow-hidden group">
            {/* Glow on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 transition-colors pointer-events-none" />

            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center font-bold text-white text-lg">
                  {business.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{business.name}</h3>
                  <p className="text-sm text-gray-400">{business.category}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded-md">
                <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                <span className="text-sm font-medium text-yellow-500">{business.rating}</span>
                <span className="text-xs text-yellow-500/70">({business.reviews})</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 relative z-10 border-t border-white/10 pt-4">
              <div>
                <p className="text-xs text-gray-500">Hourly Rate</p>
                <p className="font-semibold text-white">${business.hourlyRate}/hr</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Job Success</p>
                <p className="font-semibold text-green-400">{business.successRate}</p>
              </div>
            </div>

            <div className="mb-6 relative z-10 flex-1">
              <p className="text-xs text-gray-500 mb-2">Top Skills</p>
              <div className="flex flex-wrap gap-2">
                {business.skills.map((skill, index) => (
                  <span key={index} className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-gray-300">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <button 
              onClick={() => handleInvite(business.id, business.name)}
              disabled={isInviting !== null}
              className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors border border-white/10 relative z-10 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isInviting === business.id ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending Invite...
                </>
              ) : (
                "Invite to Project"
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
