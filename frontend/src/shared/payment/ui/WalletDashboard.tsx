"use client";

import React, { useState } from "react";
import { useProjects } from "@/core/projects/context/ProjectContext";

export function WalletDashboard() {
  const { walletBalance, totalEscrow, depositFunds } = useProjects();
  const [isAddingFunds, setIsAddingFunds] = useState(false);
  const [addAmount, setAddAmount] = useState("");

  const handleAddFunds = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addAmount || Number(addAmount) <= 0) return;
    depositFunds(Number(addAmount));
    setIsAddingFunds(false);
    setAddAmount("");
    alert(`Successfully deposited $${addAmount} into your Wallet!`);
  };

  const transactions = [
    { id: "TX-9982", type: "Escrow Deposit", project: "Mobile App Development", amount: -500, date: "2026-07-05", status: "Secured" },
    { id: "TX-9981", type: "Card Deposit", project: "N/A", amount: 1500, date: "2026-07-04", status: "Completed" },
    { id: "TX-9980", type: "Payment Release", project: "Website Design", amount: -100, date: "2026-07-02", status: "Completed" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Wallet & Escrow</h2>
        <p className="text-slate-600">Manage your available funds, deposit securely into Escrow, and track payment history.</p>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Available Wallet Balance */}
        <div className="bg-gradient-to-br from-blue-600 to-purple-600 border border-transparent rounded-3xl p-8 relative overflow-hidden group shadow-md text-white">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 blur-[60px] pointer-events-none group-hover:bg-white/30 transition-colors" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
              </div>
              <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium text-white backdrop-blur-md">Active</span>
            </div>
            <div>
              <p className="text-sm font-medium text-blue-100 mb-1">Available Wallet Balance</p>
              <h3 className="text-4xl font-bold text-white tracking-tight">${walletBalance.toFixed(2)}</h3>
            </div>
            <div className="mt-8 flex gap-3">
              <button 
                onClick={() => setIsAddingFunds(true)}
                className="flex-1 py-3 bg-white hover:bg-slate-50 text-slate-900 font-semibold rounded-xl transition-colors shadow-lg active:scale-[0.98]"
              >
                + Add Funds
              </button>
              <button className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors border border-white/20 active:scale-[0.98]">
                Withdraw
              </button>
            </div>
          </div>
        </div>

        {/* Escrow Balance */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-[60px] pointer-events-none group-hover:bg-purple-500/20 transition-colors" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center border border-purple-100">
                <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <span className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-100 rounded-full text-xs font-medium">Secured</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Funds locked in Escrow</p>
              <h3 className="text-4xl font-bold text-slate-900 tracking-tight">${totalEscrow.toFixed(2)}</h3>
            </div>
            <div className="mt-8">
              <p className="text-sm text-slate-600 leading-relaxed">
                Escrow funds are safely held by the platform and only released to the business when you explicitly <strong className="text-purple-600 font-medium">Approve</strong> the final project milestone.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Add Funds Modal/Inline Form */}
      {isAddingFunds && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md animate-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Deposit Funds via Card</h3>
            <button onClick={() => setIsAddingFunds(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <form onSubmit={handleAddFunds} className="flex gap-4 items-end">
            <div className="flex-1 space-y-1">
              <label className="text-sm font-medium text-slate-700">Amount (USD)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">$</span>
                <input 
                  type="number" 
                  min="1"
                  required
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 text-slate-900 outline-none placeholder-slate-400" 
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-sm font-medium text-slate-700">Saved Card</label>
              <select className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 outline-none appearance-none focus:ring-2 focus:ring-blue-500/30">
                <option>Visa ending in 4242</option>
                <option>Mastercard ending in 8899</option>
              </select>
            </div>
            <button type="submit" className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors shadow-lg shadow-blue-500/25 active:scale-[0.98]">
              Deposit Now
            </button>
          </form>
        </div>
      )}

      {/* Transaction History */}
      <div>
        <h3 className="text-xl font-bold text-slate-900 mb-4">Recent Transactions</h3>
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Transaction ID</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold">Project</th>
                <th className="px-6 py-4 font-semibold text-right">Amount</th>
                <th className="px-6 py-4 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 text-slate-600 font-mono text-xs">{tx.id}</td>
                  <td className="px-6 py-4 text-slate-500">{tx.date}</td>
                  <td className="px-6 py-4">
                    <span className="text-slate-900 font-medium">{tx.type}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{tx.project}</td>
                  <td className={`px-6 py-4 text-right font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-slate-900'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`inline-block px-2 py-1 rounded-md text-xs font-medium border ${
                      tx.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-purple-50 text-purple-700 border-purple-100'
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
