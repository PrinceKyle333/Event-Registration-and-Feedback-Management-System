import React from 'react';

export interface SummaryCard {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: 'white' | 'gold' | 'green';
}

const TONE_CLASS: Record<NonNullable<SummaryCard['tone']>, string> = {
  white: 'text-white',
  gold: 'text-[#FFC600]',
  green: 'text-emerald-400',
};

// Green KPI strip shown at the top of each module page
export const SummaryCards: React.FC<{ cards: SummaryCard[] }> = ({ cards }) => (
  <div className={`grid grid-cols-2 gap-3 ${cards.length >= 4 ? 'lg:grid-cols-4' : 'sm:grid-cols-3'}`}>
    {cards.map((card) => (
      <div
        key={card.label}
        className="relative overflow-hidden bg-gradient-to-br from-[#00491E] via-[#013f19] to-[#002f12] text-white p-4 rounded-2xl border border-[#02681E] shadow-sm"
      >
        <span className="text-[10px] font-black text-emerald-200 uppercase tracking-wider block">{card.label}</span>
        <span className={`text-2xl font-black font-sans-cmu tabular-nums mt-1 block ${TONE_CLASS[card.tone ?? 'white']}`}>
          {card.value}
        </span>
        {card.hint && <span className="text-[10px] text-emerald-300/80 block mt-0.5">{card.hint}</span>}
      </div>
    ))}
  </div>
);

export interface SubTab<T extends string> {
  id: T;
  label: string;
  icon: React.ElementType;
}

// Tab strip limited to the sibling pages of the current sidebar dropdown
export function SubTabBar<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: SubTab<T>[];
  active: T;
  onChange: (id: T) => void;
}) {
  if (tabs.length < 2) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-stone-100 rounded-xl border border-stone-200 text-xs font-bold">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              active === tab.id ? 'bg-[#00491E] text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Icon size={14} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
