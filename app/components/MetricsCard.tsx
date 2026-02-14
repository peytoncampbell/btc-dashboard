import React from 'react';

interface MetricsCardProps {
  title: string;
  icon: string;
  children: React.ReactNode;
  className?: string;
}

export default function MetricsCard({ title, icon, children, className = "" }: MetricsCardProps) {
  return (
    <div className={`bg-gray-900/40 backdrop-blur-sm rounded-xl border border-gray-800 p-3 sm:p-4 ${className}`}>
      <div className="flex items-center gap-1 sm:gap-2 mb-2 sm:mb-3">
        <span className="text-sm sm:text-lg">{icon}</span>
        <h3 className="text-xs sm:text-sm font-semibold text-gray-400 uppercase tracking-wider truncate">{title}</h3>
      </div>
      <div className="text-sm sm:text-base">
        {children}
      </div>
    </div>
  );
}