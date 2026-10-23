import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="no-print mt-auto bg-stone-900 text-stone-400 text-xs border-t border-stone-800 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="font-semibold text-stone-200">
            Central Mindanao University · University Town, Musuan, Maramag, Bukidnon
          </div>
          <p className="text-[11px] text-stone-500 mt-0.5">
            College of Information Sciences and Computing · BSIT 4B System Integration and Architecture (SIA)
          </p>
        </div>

        <div className="text-right text-[11px] text-stone-500">
          <div>Database: <span className="font-mono text-stone-400">event_evaluation_system</span> (MySQL)</div>
          <div>REST API Specification v1.0</div>
        </div>
      </div>
    </footer>
  );
};
