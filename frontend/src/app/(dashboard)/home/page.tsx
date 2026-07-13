import React from "react";
import Link from "next/link";

export default function SuperAppHome() {
  const services = [
    {
      id: "ride",
      title: "Book a Ride",
      description: "Fast, reliable rides to your destination.",
      icon: (
        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
      ),
      bg: "from-blue-600 to-blue-400",
      href: "/ride",
    },
    {
      id: "transport",
      title: "Hire Transport",
      description: "Trucks and fleets for your cargo needs.",
      icon: (
        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
      ),
      bg: "from-orange-600 to-orange-400",
      href: "#", // Mock for now
    },
    {
      id: "agency",
      title: "Post IT Project",
      description: "Hire top agencies for software & design.",
      icon: (
        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
      ),
      bg: "from-purple-600 to-purple-400",
      href: "/projects/new",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="mb-10 text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">What do you need today?</h1>
        <p className="text-xl text-slate-600 max-w-2xl">Select a service to get started. From booking a ride to hiring a software agency, everything is built into your single account.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service) => (
          <Link key={service.id} href={service.href} className="group block">
            <div className={`h-full rounded-3xl p-8 bg-gradient-to-br ${service.bg} relative overflow-hidden transition-transform duration-300 transform group-hover:-translate-y-2 group-hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]`}>
              {/* Decorative elements */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/20 rounded-full blur-[30px] group-hover:bg-white/30 transition-colors pointer-events-none" />
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-6 shadow-inner">
                  {service.icon}
                </div>
                <div className="mt-auto">
                  <h3 className="text-2xl font-bold text-white mb-2 group-hover:translate-x-1 transition-transform">{service.title} &rarr;</h3>
                  <p className="text-white/80 leading-relaxed">
                    {service.description}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
