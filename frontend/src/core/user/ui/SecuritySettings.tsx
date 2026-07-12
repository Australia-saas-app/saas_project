"use client";

import React, { useState } from "react";
import { useProjects } from "@/core/projects/context/ProjectContext";

export function SecuritySettings() {
  const { walletBalance, projects } = useProjects();
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const activeProjects = projects.filter(p => p.status === "In Progress" || p.status === "Disputed" || p.status === "Open for Bids").length;
  const unpaidAmount = projects.reduce((sum, p) => p.status === "In Progress" ? sum + p.budget : sum, 0);

  const deleteData = {
    walletBalance: walletBalance,
    activeProjects: activeProjects,
    unpaidAmount: unpaidAmount,
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      alert("Passwords do not match!");
      return;
    }
    alert("Password successfully changed. You will now be automatically logged out.");
    // Simulate auto logout
    window.location.href = "/login";
  };

  const handleAccountDelete = () => {
    if (deleteData.walletBalance > 0 || deleteData.activeProjects > 0 || deleteData.unpaidAmount > 0) {
      alert("Cannot delete account. You must have a $0 wallet balance and 0 active projects.");
      return;
    }
    const confirmed = confirm("Are you sure you want to delete your account? It will be marked Dormant and can only be recovered within 60 days.");
    if (confirmed) {
      alert("Account deleted. Status: DORMANT.");
      window.location.href = "/login";
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Security & Privacy</h2>
        <p className="text-slate-600">Manage your account security, passwords, and 2-Factor Authentication.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Password & 2FA */}
        <div className="space-y-8">
          
          {/* Change Password */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Change Password</h3>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Current Password</label>
                <input type="password" required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/30 text-slate-900 outline-none" value={passwords.current} onChange={(e) => setPasswords({...passwords, current: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">New Password</label>
                <input type="password" required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/30 text-slate-900 outline-none" value={passwords.new} onChange={(e) => setPasswords({...passwords, new: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Confirm New Password</label>
                <input type="password" required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/30 text-slate-900 outline-none" value={passwords.confirm} onChange={(e) => setPasswords({...passwords, confirm: e.target.value})} />
              </div>
              <button type="submit" className="px-6 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium rounded-xl transition-colors border border-slate-200 w-full mt-2">
                Update Password
              </button>
            </form>
          </div>

          {/* Two-Factor Auth */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Two-Factor Authentication (2FA)</h3>
                <p className="text-sm text-slate-500 max-w-sm">Secure your account with an OTP sent to your primary email or phone number on every login.</p>
              </div>
              <button 
                onClick={() => setIs2FAEnabled(!is2FAEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${is2FAEnabled ? 'bg-purple-600' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${is2FAEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            
            {is2FAEnabled && (
              <div className="mt-6 p-4 rounded-xl bg-purple-50 border border-purple-200">
                <p className="text-sm text-purple-800">
                  <span className="font-semibold text-purple-700">2FA is Active.</span> We will send a secure OTP to <strong className="font-medium">john@example.com</strong> when you log in from a new device, clear cookies, or change locations.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Danger Zone */}
        <div className="space-y-8">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-red-600 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              Danger Zone
            </h3>
            <p className="text-sm text-slate-600 mb-6">Once you delete your account, it will be marked as Dormant. You have exactly 60 days to recover it before permanent deletion.</p>

            <div className="space-y-3 mb-6 p-4 bg-white rounded-xl border border-red-100 shadow-sm">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Wallet Balance</span>
                <span className={`font-mono font-medium ${deleteData.walletBalance === 0 ? 'text-green-600' : 'text-red-600'}`}>${deleteData.walletBalance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Unpaid Projects</span>
                <span className={`font-mono font-medium ${deleteData.unpaidAmount === 0 ? 'text-green-600' : 'text-red-600'}`}>${deleteData.unpaidAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Active Projects</span>
                <span className={`font-mono font-medium ${deleteData.activeProjects === 0 ? 'text-green-600' : 'text-red-600'}`}>{deleteData.activeProjects}</span>
              </div>
            </div>

            <button 
              onClick={handleAccountDelete}
              className="px-6 py-2.5 bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded-xl transition-colors border border-red-200 w-full"
            >
              Delete Account
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
