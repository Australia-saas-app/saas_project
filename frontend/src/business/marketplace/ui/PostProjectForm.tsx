"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useProjects } from "@/core/projects/context/ProjectContext";

export function PostProjectForm() {
  const router = useRouter();
  const { addProject } = useProjects();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    budget: "",
    deadline: "",
    requirements: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call to create project
    setTimeout(() => {
      setIsLoading(false);
      addProject({
        title: formData.title,
        category: formData.category,
        budget: Number(formData.budget),
        deadline: formData.deadline,
        requirements: formData.requirements,
      });
      alert("Project posted successfully! You can now invite businesses to bid on it.");
      router.push("/projects"); // Redirect to My Projects so they see it
    }, 1000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Post a New Project</h2>
        <p className="text-slate-600">Describe what you need done, set a budget, and discover top-tier businesses.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-[100px] pointer-events-none" />

        <form onSubmit={handleSubmit} className="relative z-10 space-y-6">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Project Title</label>
            <input 
              type="text" 
              required 
              placeholder="e.g. E-Commerce Website Design"
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/30 text-slate-900 outline-none placeholder-slate-400" 
              value={formData.title} 
              onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Category</label>
              <select 
                required 
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/30 text-slate-900 outline-none appearance-none" 
                value={formData.category} 
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="">Select a Category</option>
                <option value="Design">Design & Creative</option>
                <option value="Engineering">Software Engineering</option>
                <option value="Marketing">Digital Marketing</option>
                <option value="Writing">Writing & Translation</option>
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Budget (USD)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-slate-400">$</span>
                </div>
                <input 
                  type="number" 
                  min="5"
                  required 
                  placeholder="100"
                  className="w-full pl-8 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/30 text-slate-900 outline-none placeholder-slate-400" 
                  value={formData.budget} 
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })} 
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Deadline</label>
            <input 
              type="date" 
              required 
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/30 text-slate-900 outline-none" 
              value={formData.deadline} 
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} 
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Project Requirements</label>
            <textarea 
              required 
              placeholder="Describe your project in detail. What are the deliverables?"
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/30 text-slate-900 outline-none min-h-[150px] placeholder-slate-400" 
              value={formData.requirements} 
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })} 
            />
          </div>

          <div className="pt-6 border-t border-slate-200 flex justify-between items-center">
            <p className="text-xs text-slate-500 max-w-sm">
              Your budget will be held safely in <span className="text-purple-600 font-medium">Escrow</span> until you approve the final deliverables.
            </p>
            <button
              type="submit"
              disabled={isLoading}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-purple-500/25 active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              Post Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
