"use client";

import React, { useState } from "react";

export function ProfileSettings() {
  // Simulate a user who has NOT yet completed KYC
  const [isKYCVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [profile, setProfile] = useState({
    fullName: "John Doe",
    currency: "USD",
    primaryEmail: "john@example.com",
    emails: ["john@example.com", "j.doe@work.com"],
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      alert("Profile updated successfully!");
    }, 1000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Profile Settings</h2>
        <p className="text-slate-600">Manage your personal information and contact details.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 relative overflow-hidden shadow-sm">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 blur-[100px] pointer-events-none" />

        <form onSubmit={handleSave} className="relative z-10 space-y-6">
          {/* Profile Photo */}
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-3xl font-bold text-white shadow-lg shrink-0">
              JD
            </div>
            <div>
              <button type="button" className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-medium rounded-lg transition-colors border border-slate-200">
                Change Photo
              </button>
              <p className="text-xs text-slate-500 mt-2">JPG, GIF or PNG. Max size of 5MB.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Full Name</label>
              <input
                type="text"
                disabled={isKYCVerified}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/30 text-slate-900 outline-none disabled:opacity-50 disabled:bg-slate-50 disabled:cursor-not-allowed transition-all"
                value={profile.fullName}
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
              />
              {isKYCVerified && (
                <p className="text-xs text-yellow-600 mt-1 flex items-center gap-1 font-medium">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                  Locked after KYC Verification
                </p>
              )}
            </div>

            {/* Currency */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Preferred Currency</label>
              <select
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/30 text-slate-900 outline-none appearance-none transition-all"
                value={profile.currency}
                onChange={(e) => setProfile({ ...profile, currency: e.target.value })}
              >
                <option value="USD">USD ($) - Default</option>
                <option value="EUR">EUR (€)</option>
                <option value="AUD">AUD ($)</option>
              </select>
            </div>
          </div>

          {/* Contact Information (Emails/Phones) */}
          <div className="pt-6 border-t border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Contact Methods</h3>
              <button type="button" className="text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors">
                + Add Email / Phone
              </button>
            </div>
            
            <div className="space-y-3">
              {profile.emails.map((email, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{email}</p>
                      {email === profile.primaryEmail ? (
                        <span className="text-xs font-medium text-purple-600">Primary Contact</span>
                      ) : (
                        <span className="text-xs text-slate-500">Secondary Contact</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {email !== profile.primaryEmail && (
                      <button type="button" className="text-xs font-medium text-slate-500 hover:text-slate-800 px-2 py-1 transition-colors">Make Primary</button>
                    )}
                    {email !== profile.primaryEmail && (
                      <button type="button" className="text-xs font-medium text-red-500 hover:text-red-700 px-2 py-1 transition-colors">Delete</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">* Adding or deleting a contact method requires OTP / Password verification.</p>
          </div>

          <div className="pt-6 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-purple-500/25 active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
