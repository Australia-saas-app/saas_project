"use client";

import React, { useState } from "react";
import { useProjects } from "@/core/projects/context/ProjectContext";

const MOCK_BUSINESSES = [
  {
    id: "BUS-01",
    name: "CreativeTech Ltd",
    type: "Agency",
    rating: 4.9,
    reviews: 124,
    description: "Expert digital agency specializing in React and modern UI design.",
    hourlyRate: 50,
  },
  {
    id: "BUS-02",
    name: "AppDev Pros",
    type: "Agency",
    rating: 4.7,
    reviews: 89,
    description: "Full-stack mobile application developers for iOS and Android.",
    hourlyRate: 65,
  },
  {
    id: "BUS-03",
    name: "John Swift",
    type: "Rider",
    rating: 4.9,
    reviews: 312,
    description: "Fast and reliable delivery services across the metro area.",
    hourlyRate: 20,
  }
];

export default function DiscoverPage() {
  const { projects, assignBusiness } = useProjects();
  const openProjects = projects.filter(p => p.status === "Open for Bids");
  
  const [selectedBusiness, setSelectedBusiness] = useState<typeof MOCK_BUSINESSES[0] | null>(null);

  const handleInvite = (projectId: string) => {
    if (!selectedBusiness) return;
    assignBusiness(projectId, selectedBusiness.id, selectedBusiness.name);
    alert(`Successfully invited ${selectedBusiness.name} to your project! They are now hired.`);
    setSelectedBusiness(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Discover Businesses</h2>
        <p className="text-slate-600">Find top-rated agencies and riders for your next project.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_BUSINESSES.map((business) => (
          <div key={business.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center font-bold text-white shadow-sm shrink-0">
                {business.name.charAt(0)}
              </div>
              <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-md border border-slate-200">
                {business.type}
              </span>
            </div>
            
            <h3 className="text-lg font-bold text-slate-900 mb-1">{business.name}</h3>
            
            <div className="flex items-center gap-1 mb-4">
              <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              <span className="text-sm font-bold text-slate-900">{business.rating}</span>
              <span className="text-sm text-slate-500">({business.reviews} reviews)</span>
            </div>
            
            <p className="text-sm text-slate-600 flex-grow mb-6">{business.description}</p>
            
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
              <div>
                <p className="text-xs text-slate-500 font-medium">Starting from</p>
                <p className="text-lg font-bold text-slate-900">${business.hourlyRate}/hr</p>
              </div>
              <button 
                onClick={() => setSelectedBusiness(business)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
              >
                Hire / Invite
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Invite Modal */}
      {selectedBusiness && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Invite {selectedBusiness.name}</h3>
              <button onClick={() => setSelectedBusiness(null)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">Select an open project to invite this business to. Once they accept, funds will be locked in escrow.</p>
              
              {openProjects.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-slate-500 mb-3">You don't have any open projects.</p>
                  <a href="/projects/new" className="text-blue-600 font-medium hover:underline text-sm">Post a New Project</a>
                </div>
              ) : (
                <div className="space-y-3">
                  {openProjects.map(project => (
                    <div key={project.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-colors">
                      <div>
                        <p className="font-semibold text-slate-900">{project.title}</p>
                        <p className="text-xs text-slate-500">Budget: ${project.budget}</p>
                      </div>
                      <button 
                        onClick={() => handleInvite(project.id)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                      >
                        Invite
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
