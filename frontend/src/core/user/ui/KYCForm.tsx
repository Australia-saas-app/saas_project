"use client";

import React, { useState } from "react";

export function KYCForm() {
  const [kycStatus, setKycStatus] = useState<"none" | "pending" | "approved" | "rejected">("none");
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "John Doe",
    gender: "",
    dateOfBirth: "",
    nationality: "",
    documentType: "NID",
    documentNumber: "",
    country: "",
    city: "",
    state: "",
    zip: "",
    address: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setKycStatus("pending");
      alert("KYC documents submitted successfully. Status is now PENDING.");
    }, 1500);
  };

  if (kycStatus === "pending") {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-8 text-center animate-in zoom-in duration-300 shadow-sm">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-200">
          <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Verification Pending</h2>
        <p className="text-slate-600 max-w-md mx-auto">Your identity documents are currently being reviewed. This usually takes 1-2 business days. You will be notified once approved.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Identity Verification (KYC)</h2>
        <p className="text-slate-600">Please provide accurate information. This is required for large payments and withdrawals.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] pointer-events-none" />

        <form onSubmit={handleSubmit} className="relative z-10 space-y-8">
          {/* Section 1: Personal Details */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4 border-b border-slate-200 pb-2">1. Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Full Name (As per ID)</label>
                <input type="text" required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 text-slate-900 outline-none placeholder-slate-400" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Date of Birth</label>
                <input type="date" required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 text-slate-900 outline-none" value={formData.dateOfBirth} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Gender</label>
                <select required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 text-slate-900 outline-none appearance-none" value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })}>
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Nationality</label>
                <input type="text" required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 text-slate-900 outline-none" value={formData.nationality} onChange={(e) => setFormData({ ...formData, nationality: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Section 2: Document Upload */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4 border-b border-slate-200 pb-2">2. Identity Document</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Document Type</label>
                <select required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 text-slate-900 outline-none appearance-none" value={formData.documentType} onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}>
                  <option value="NID">National ID Card</option>
                  <option value="Passport">Passport</option>
                  <option value="DrivingLicense">Driving License</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Document Number</label>
                <input type="text" required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 text-slate-900 outline-none" value={formData.documentNumber} onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })} />
              </div>
            </div>
            <div className="mt-4 p-8 border-2 border-dashed border-slate-300 rounded-xl text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group">
              <svg className="w-10 h-10 text-slate-400 group-hover:text-blue-500 mx-auto mb-2 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              <p className="text-sm text-slate-700 font-medium">Click to upload Photo of ID</p>
              <p className="text-xs text-slate-500 mt-1">Clear, visible photos only. Max 10MB.</p>
            </div>
            <div className="mt-4 p-8 border-2 border-dashed border-slate-300 rounded-xl text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group">
              <svg className="w-10 h-10 text-slate-400 group-hover:text-blue-500 mx-auto mb-2 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-sm text-slate-700 font-medium">Click to upload Selfie (KYC)</p>
              <p className="text-xs text-slate-500 mt-1">A clear photo of your face.</p>
            </div>
          </div>

          {/* Section 3: Address */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4 border-b border-slate-200 pb-2">3. Permanent Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Country</label>
                <input type="text" required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 text-slate-900 outline-none" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">City</label>
                <input type="text" required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 text-slate-900 outline-none" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">State / Province</label>
                <input type="text" required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 text-slate-900 outline-none" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">ZIP / Postal Code</label>
                <input type="text" required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 text-slate-900 outline-none" value={formData.zip} onChange={(e) => setFormData({ ...formData, zip: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Full Address</label>
              <textarea required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 text-slate-900 outline-none min-h-[100px]" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              Submit for Verification
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
