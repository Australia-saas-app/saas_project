"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronUp, X, ChevronDown } from "lucide-react";

const footerLinks = [
  [
    "Online banking service advertisement",
    "Advertising practices",
    "Your privacy policies",
    "Sitemap",
    "Careers",
    "Blog",
    "Press & Media",
  ],
  [
    "Terms of Service",
    "Cookie Policy",
    "Security",
    "Support Center",
    "Partnerships",
    "API Docs",
    "Accessibility",
    "Legal",
    "Compliance",
  ],
  [
    "About Us",
    "How It Works",
    "Your privacy policies",
    "Sitemap",
    "Careers",
    "Contact",
    "tasting",
  ],
];

const socialLinks = [
  {
    label: "Facebook",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
      </svg>
    ),
  },
  {
    label: "TikTok",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.78a4.85 4.85 0 01-1.01-.09z" />
      </svg>
    ),
  },
  {
    label: "Twitter",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
      </svg>
    ),
  },
];

// All world country codes sorted A-Z by country name
const countryCodes = [
  { name: "Afghanistan", flag: "🇦🇫", code: "+93" },
  { name: "Albania", flag: "🇦🇱", code: "+355" },
  { name: "Algeria", flag: "🇩🇿", code: "+213" },
  { name: "Andorra", flag: "🇦🇩", code: "+376" },
  { name: "Angola", flag: "🇦🇴", code: "+244" },
  { name: "Antigua & Barbuda", flag: "🇦🇬", code: "+1-268" },
  { name: "Argentina", flag: "🇦🇷", code: "+54" },
  { name: "Armenia", flag: "🇦🇲", code: "+374" },
  { name: "Australia", flag: "🇦🇺", code: "+61" },
  { name: "Austria", flag: "🇦🇹", code: "+43" },
  { name: "Azerbaijan", flag: "🇦🇿", code: "+994" },
  { name: "Bahamas", flag: "🇧🇸", code: "+1-242" },
  { name: "Bahrain", flag: "🇧🇭", code: "+973" },
  { name: "Bangladesh", flag: "🇧🇩", code: "+880" },
  { name: "Barbados", flag: "🇧🇧", code: "+1-246" },
  { name: "Belarus", flag: "🇧🇾", code: "+375" },
  { name: "Belgium", flag: "🇧🇪", code: "+32" },
  { name: "Belize", flag: "🇧🇿", code: "+501" },
  { name: "Benin", flag: "🇧🇯", code: "+229" },
  { name: "Bhutan", flag: "🇧🇹", code: "+975" },
  { name: "Bolivia", flag: "🇧🇴", code: "+591" },
  { name: "Bosnia & Herzegovina", flag: "🇧🇦", code: "+387" },
  { name: "Botswana", flag: "🇧🇼", code: "+267" },
  { name: "Brazil", flag: "🇧🇷", code: "+55" },
  { name: "Brunei", flag: "🇧🇳", code: "+673" },
  { name: "Bulgaria", flag: "🇧🇬", code: "+359" },
  { name: "Burkina Faso", flag: "🇧🇫", code: "+226" },
  { name: "Burundi", flag: "🇧🇮", code: "+257" },
  { name: "Cambodia", flag: "🇰🇭", code: "+855" },
  { name: "Cameroon", flag: "🇨🇲", code: "+237" },
  { name: "Canada", flag: "🇨🇦", code: "+1" },
  { name: "Cape Verde", flag: "🇨🇻", code: "+238" },
  { name: "Central African Republic", flag: "🇨🇫", code: "+236" },
  { name: "Chad", flag: "🇹🇩", code: "+235" },
  { name: "Chile", flag: "🇨🇱", code: "+56" },
  { name: "China", flag: "🇨🇳", code: "+86" },
  { name: "Colombia", flag: "🇨🇴", code: "+57" },
  { name: "Comoros", flag: "🇰🇲", code: "+269" },
  { name: "Congo (Brazzaville)", flag: "🇨🇬", code: "+242" },
  { name: "Congo (Kinshasa)", flag: "🇨🇩", code: "+243" },
  { name: "Costa Rica", flag: "🇨🇷", code: "+506" },
  { name: "Croatia", flag: "🇭🇷", code: "+385" },
  { name: "Cuba", flag: "🇨🇺", code: "+53" },
  { name: "Cyprus", flag: "🇨🇾", code: "+357" },
  { name: "Czech Republic", flag: "🇨🇿", code: "+420" },
  { name: "Denmark", flag: "🇩🇰", code: "+45" },
  { name: "Djibouti", flag: "🇩🇯", code: "+253" },
  { name: "Dominica", flag: "🇩🇲", code: "+1-767" },
  { name: "Dominican Republic", flag: "🇩🇴", code: "+1-809" },
  { name: "Ecuador", flag: "🇪🇨", code: "+593" },
  { name: "Egypt", flag: "🇪🇬", code: "+20" },
  { name: "El Salvador", flag: "🇸🇻", code: "+503" },
  { name: "Equatorial Guinea", flag: "🇬🇶", code: "+240" },
  { name: "Eritrea", flag: "🇪🇷", code: "+291" },
  { name: "Estonia", flag: "🇪🇪", code: "+372" },
  { name: "Eswatini", flag: "🇸🇿", code: "+268" },
  { name: "Ethiopia", flag: "🇪🇹", code: "+251" },
  { name: "Fiji", flag: "🇫🇯", code: "+679" },
  { name: "Finland", flag: "🇫🇮", code: "+358" },
  { name: "France", flag: "🇫🇷", code: "+33" },
  { name: "Gabon", flag: "🇬🇦", code: "+241" },
  { name: "Gambia", flag: "🇬🇲", code: "+220" },
  { name: "Georgia", flag: "🇬🇪", code: "+995" },
  { name: "Germany", flag: "🇩🇪", code: "+49" },
  { name: "Ghana", flag: "🇬🇭", code: "+233" },
  { name: "Greece", flag: "🇬🇷", code: "+30" },
  { name: "Grenada", flag: "🇬🇩", code: "+1-473" },
  { name: "Guatemala", flag: "🇬🇹", code: "+502" },
  { name: "Guinea", flag: "🇬🇳", code: "+224" },
  { name: "Guinea-Bissau", flag: "🇬🇼", code: "+245" },
  { name: "Guyana", flag: "🇬🇾", code: "+592" },
  { name: "Haiti", flag: "🇭🇹", code: "+509" },
  { name: "Honduras", flag: "🇭🇳", code: "+504" },
  { name: "Hungary", flag: "🇭🇺", code: "+36" },
  { name: "Iceland", flag: "🇮🇸", code: "+354" },
  { name: "India", flag: "🇮🇳", code: "+91" },
  { name: "Indonesia", flag: "🇮🇩", code: "+62" },
  { name: "Iran", flag: "🇮🇷", code: "+98" },
  { name: "Iraq", flag: "🇮🇶", code: "+964" },
  { name: "Ireland", flag: "🇮🇪", code: "+353" },
  { name: "Israel", flag: "🇮🇱", code: "+972" },
  { name: "Italy", flag: "🇮🇹", code: "+39" },
  { name: "Jamaica", flag: "🇯🇲", code: "+1-876" },
  { name: "Japan", flag: "🇯🇵", code: "+81" },
  { name: "Jordan", flag: "🇯🇴", code: "+962" },
  { name: "Kazakhstan", flag: "🇰🇿", code: "+7" },
  { name: "Kenya", flag: "🇰🇪", code: "+254" },
  { name: "Kiribati", flag: "🇰🇮", code: "+686" },
  { name: "Kosovo", flag: "🇽🇰", code: "+383" },
  { name: "Kuwait", flag: "🇰🇼", code: "+965" },
  { name: "Kyrgyzstan", flag: "🇰🇬", code: "+996" },
  { name: "Laos", flag: "🇱🇦", code: "+856" },
  { name: "Latvia", flag: "🇱🇻", code: "+371" },
  { name: "Lebanon", flag: "🇱🇧", code: "+961" },
  { name: "Lesotho", flag: "🇱🇸", code: "+266" },
  { name: "Liberia", flag: "🇱🇷", code: "+231" },
  { name: "Libya", flag: "🇱🇾", code: "+218" },
  { name: "Liechtenstein", flag: "🇱🇮", code: "+423" },
  { name: "Lithuania", flag: "🇱🇹", code: "+370" },
  { name: "Luxembourg", flag: "🇱🇺", code: "+352" },
  { name: "Madagascar", flag: "🇲🇬", code: "+261" },
  { name: "Malawi", flag: "🇲🇼", code: "+265" },
  { name: "Malaysia", flag: "🇲🇾", code: "+60" },
  { name: "Maldives", flag: "🇲🇻", code: "+960" },
  { name: "Mali", flag: "🇲🇱", code: "+223" },
  { name: "Malta", flag: "🇲🇹", code: "+356" },
  { name: "Marshall Islands", flag: "🇲🇭", code: "+692" },
  { name: "Mauritania", flag: "🇲🇷", code: "+222" },
  { name: "Mauritius", flag: "🇲🇺", code: "+230" },
  { name: "Mexico", flag: "🇲🇽", code: "+52" },
  { name: "Micronesia", flag: "🇫🇲", code: "+691" },
  { name: "Moldova", flag: "🇲🇩", code: "+373" },
  { name: "Monaco", flag: "🇲🇨", code: "+377" },
  { name: "Mongolia", flag: "🇲🇳", code: "+976" },
  { name: "Montenegro", flag: "🇲🇪", code: "+382" },
  { name: "Morocco", flag: "🇲🇦", code: "+212" },
  { name: "Mozambique", flag: "🇲🇿", code: "+258" },
  { name: "Myanmar", flag: "🇲🇲", code: "+95" },
  { name: "Namibia", flag: "🇳🇦", code: "+264" },
  { name: "Nauru", flag: "🇳🇷", code: "+674" },
  { name: "Nepal", flag: "🇳🇵", code: "+977" },
  { name: "Netherlands", flag: "🇳🇱", code: "+31" },
  { name: "New Zealand", flag: "🇳🇿", code: "+64" },
  { name: "Nicaragua", flag: "🇳🇮", code: "+505" },
  { name: "Niger", flag: "🇳🇪", code: "+227" },
  { name: "Nigeria", flag: "🇳🇬", code: "+234" },
  { name: "North Korea", flag: "🇰🇵", code: "+850" },
  { name: "North Macedonia", flag: "🇲🇰", code: "+389" },
  { name: "Norway", flag: "🇳🇴", code: "+47" },
  { name: "Oman", flag: "🇴🇲", code: "+968" },
  { name: "Pakistan", flag: "🇵🇰", code: "+92" },
  { name: "Palau", flag: "🇵🇼", code: "+680" },
  { name: "Palestine", flag: "🇵🇸", code: "+970" },
  { name: "Panama", flag: "🇵🇦", code: "+507" },
  { name: "Papua New Guinea", flag: "🇵🇬", code: "+675" },
  { name: "Paraguay", flag: "🇵🇾", code: "+595" },
  { name: "Peru", flag: "🇵🇪", code: "+51" },
  { name: "Philippines", flag: "🇵🇭", code: "+63" },
  { name: "Poland", flag: "🇵🇱", code: "+48" },
  { name: "Portugal", flag: "🇵🇹", code: "+351" },
  { name: "Qatar", flag: "🇶🇦", code: "+974" },
  { name: "Romania", flag: "🇷🇴", code: "+40" },
  { name: "Russia", flag: "🇷🇺", code: "+7" },
  { name: "Rwanda", flag: "🇷🇼", code: "+250" },
  { name: "Saint Kitts & Nevis", flag: "🇰🇳", code: "+1-869" },
  { name: "Saint Lucia", flag: "🇱🇨", code: "+1-758" },
  { name: "Saint Vincent", flag: "🇻🇨", code: "+1-784" },
  { name: "Samoa", flag: "🇼🇸", code: "+685" },
  { name: "San Marino", flag: "🇸🇲", code: "+378" },
  { name: "São Tomé & Príncipe", flag: "🇸🇹", code: "+239" },
  { name: "Saudi Arabia", flag: "🇸🇦", code: "+966" },
  { name: "Senegal", flag: "🇸🇳", code: "+221" },
  { name: "Serbia", flag: "🇷🇸", code: "+381" },
  { name: "Seychelles", flag: "🇸🇨", code: "+248" },
  { name: "Sierra Leone", flag: "🇸🇱", code: "+232" },
  { name: "Singapore", flag: "🇸🇬", code: "+65" },
  { name: "Slovakia", flag: "🇸🇰", code: "+421" },
  { name: "Slovenia", flag: "🇸🇮", code: "+386" },
  { name: "Solomon Islands", flag: "🇸🇧", code: "+677" },
  { name: "Somalia", flag: "🇸🇴", code: "+252" },
  { name: "South Africa", flag: "🇿🇦", code: "+27" },
  { name: "South Korea", flag: "🇰🇷", code: "+82" },
  { name: "South Sudan", flag: "🇸🇸", code: "+211" },
  { name: "Spain", flag: "🇪🇸", code: "+34" },
  { name: "Sri Lanka", flag: "🇱🇰", code: "+94" },
  { name: "Sudan", flag: "🇸🇩", code: "+249" },
  { name: "Suriname", flag: "🇸🇷", code: "+597" },
  { name: "Sweden", flag: "🇸🇪", code: "+46" },
  { name: "Switzerland", flag: "🇨🇭", code: "+41" },
  { name: "Syria", flag: "🇸🇾", code: "+963" },
  { name: "Taiwan", flag: "🇹🇼", code: "+886" },
  { name: "Tajikistan", flag: "🇹🇯", code: "+992" },
  { name: "Tanzania", flag: "🇹🇿", code: "+255" },
  { name: "Thailand", flag: "🇹🇭", code: "+66" },
  { name: "Timor-Leste", flag: "🇹🇱", code: "+670" },
  { name: "Togo", flag: "🇹🇬", code: "+228" },
  { name: "Tonga", flag: "🇹🇴", code: "+676" },
  { name: "Trinidad & Tobago", flag: "🇹🇹", code: "+1-868" },
  { name: "Tunisia", flag: "🇹🇳", code: "+216" },
  { name: "Turkey", flag: "🇹🇷", code: "+90" },
  { name: "Turkmenistan", flag: "🇹🇲", code: "+993" },
  { name: "Tuvalu", flag: "🇹🇻", code: "+688" },
  { name: "Uganda", flag: "🇺🇬", code: "+256" },
  { name: "Ukraine", flag: "🇺🇦", code: "+380" },
  { name: "United Arab Emirates", flag: "🇦🇪", code: "+971" },
  { name: "United Kingdom", flag: "🇬🇧", code: "+44" },
  { name: "United States", flag: "🇺🇸", code: "+1" },
  { name: "Uruguay", flag: "🇺🇾", code: "+598" },
  { name: "Uzbekistan", flag: "🇺🇿", code: "+998" },
  { name: "Vanuatu", flag: "🇻🇺", code: "+678" },
  { name: "Vatican City", flag: "🇻🇦", code: "+379" },
  { name: "Venezuela", flag: "🇻🇪", code: "+58" },
  { name: "Vietnam", flag: "🇻🇳", code: "+84" },
  { name: "Yemen", flag: "🇾🇪", code: "+967" },
  { name: "Zambia", flag: "🇿🇲", code: "+260" },
  { name: "Zimbabwe", flag: "🇿🇼", code: "+263" },
];

export function Footer() {
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', code: '+1', flag: '🇺🇸', message: '' });
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCodeOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Message sent! We will get back to you soon.');
    setIsContactOpen(false);
    setForm({ name: '', email: '', phone: '', code: '+1', flag: '🇺🇸', message: '' });
  };

  return (
    <footer className="bg-[#e6f4ea] border-t border-slate-200 relative">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Link Rows */}
        <div className="space-y-3 mb-7">
          {footerLinks.map((row, rowIdx) => (
            <div key={rowIdx} className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1">
              {row.map((link, linkIdx) => (
                <span key={linkIdx} className="flex items-center gap-4">
                  <a href="#" className="text-slate-600 hover:text-blue-600 text-[11px] sm:text-xs font-medium transition-colors whitespace-nowrap">
                    {link}
                  </a>
                  {linkIdx < row.length - 1 && (
                    <span className="text-slate-300 text-xs select-none">|</span>
                  )}
                </span>
              ))}
            </div>
          ))}
        </div>

        {/* Contact Button */}
        <div className="flex justify-center mb-6">
          <button
            onClick={() => setIsContactOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-2 rounded-md transition-colors"
          >
            Contact US
          </button>
        </div>

        {/* Social Icons */}
        <div className="flex justify-center items-center gap-3 mb-6">
          {socialLinks.map((social) => (
            <a key={social.label} href={social.href} aria-label={social.label}
              className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors shadow-sm">
              {social.icon}
            </a>
          ))}
        </div>

        {/* Payment Methods */}
        <div className="flex justify-center items-center w-full px-4 sm:px-6 mb-8 mt-2">
          <img
            src="/payments.png"
            alt="Payment Methods"
            className="h-[35px] md:h-[40px] lg:h-[38px] w-auto object-contain"
          />
        </div>

        {/* Copyright */}
        <div className="text-center text-slate-500 text-[11px] sm:text-xs">
          © 2026&nbsp; All rights reserved.
        </div>
      </div>

      {/* Scroll to Top */}
      <button onClick={scrollToTop}
        className="absolute bottom-6 right-6 w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
        aria-label="Scroll to top">
        <ChevronUp className="w-5 h-5" />
      </button>

      {/* ─── Contact Us Modal ─── */}
      {isContactOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4"
          style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-[420px] max-w-[95vw] overflow-hidden">

            {/* Header */}
            <div className="border-b-2 border-blue-500 px-6 pt-5 pb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Contact us</h2>
              <button onClick={() => setIsContactOpen(false)}
                className="w-7 h-7 rounded border border-slate-300 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

              {/* Full Name */}
              <div className="relative border border-slate-300 rounded-lg px-3 pt-4 pb-2 focus-within:border-blue-500 transition-colors">
                <label className="absolute -top-2.5 left-3 bg-white px-1 text-xs font-medium text-slate-600">Full Name</label>
                <input type="text" placeholder="Full Name" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} required
                  className="w-full text-sm text-slate-800 placeholder-slate-400 outline-none bg-transparent" />
              </div>

              {/* Email */}
              <div className="relative border border-slate-300 rounded-lg px-3 pt-4 pb-2 focus-within:border-blue-500 transition-colors">
                <label className="absolute -top-2.5 left-3 bg-white px-1 text-xs font-medium text-slate-600">Email</label>
                <input type="email" placeholder="Email" value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })} required
                  className="w-full text-sm text-slate-800 placeholder-slate-400 outline-none bg-transparent" />
              </div>

              {/* Phone Number */}
              <div className="relative border border-slate-300 rounded-lg px-3 pt-4 pb-2 focus-within:border-blue-500 transition-colors">
                <label className="absolute -top-2.5 left-3 bg-white px-1 text-xs font-medium text-slate-600">Phone Number</label>
                <div className="flex items-center gap-2">

                  {/* Custom Country Code Dropdown */}
                  <div ref={dropdownRef} className="relative shrink-0">
                    <button type="button" onClick={() => setCodeOpen(!codeOpen)}
                      className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-700 transition-colors">
                      <span>{form.flag}</span>
                      <span className="font-medium">{form.code}</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>

                    {codeOpen && (
                      <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-lg overflow-y-auto"
                        style={{ width: '190px', maxHeight: '200px' }}>
                        {countryCodes.map((c) => (
                          <button key={c.name + c.code} type="button"
                            onClick={() => { setForm({ ...form, code: c.code, flag: c.flag }); setCodeOpen(false); }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 text-left transition-colors">
                            <span>{c.flag}</span>
                            <span className="flex-1 truncate">{c.name}</span>
                            <span className="text-slate-400 shrink-0">{c.code}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <input type="tel" placeholder="Phone Number" value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="flex-1 text-sm text-slate-800 placeholder-slate-400 outline-none bg-transparent" />
                </div>
              </div>

              {/* Message */}
              <div className="relative border border-slate-300 rounded-lg px-3 pt-4 pb-2 focus-within:border-blue-500 transition-colors">
                <label className="absolute -top-2.5 left-3 bg-white px-1 text-xs font-medium text-slate-600">Message</label>
                <textarea placeholder="Message" rows={5} value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })} required
                  className="w-full text-sm text-slate-800 placeholder-slate-400 outline-none bg-transparent resize-none" />
              </div>

              {/* Submit */}
              <button type="submit"
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-colors text-sm">
                Submit
              </button>

            </form>
          </div>
        </div>
      )}
    </footer>
  );
}
