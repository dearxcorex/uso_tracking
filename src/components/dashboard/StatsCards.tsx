'use client';

import React from 'react';
import { USOStats } from '@/types';

interface StatsCardsProps {
  stats: USOStats;
}

const SERVICE_CARD_CONFIG: Record<string, { color: string; iconColor: string; icon: React.ReactNode }> = {
  'Wi-Fi โรงเรียน': {
    color: 'bg-fuchsia-500',
    iconColor: 'text-fuchsia-500',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
      </svg>
    ),
  },
  'Mobile': {
    color: 'bg-emerald-500',
    iconColor: 'text-emerald-500',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  'ห้อง USO Wrap': {
    color: 'bg-rose-500',
    iconColor: 'text-rose-500',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  'อาคาร USO Net': {
    color: 'bg-amber-500',
    iconColor: 'text-amber-500',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
      </svg>
    ),
  },
};

const DEFAULT_CARD_CONFIG = {
  color: 'bg-teal-500',
  iconColor: 'text-teal-500',
  icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

export default function StatsCards({ stats }: StatsCardsProps) {
  const total = stats?.totalPoints ?? 0;

  const serviceEntries = Object.entries(stats?.byServiceName ?? {}).sort((a, b) => b[1] - a[1]);

  const statItems = [
    {
      label: 'จุดบริการทั้งหมด',
      value: total,
      ...DEFAULT_CARD_CONFIG,
    },
    ...serviceEntries.map(([name, count]) => {
      const config = SERVICE_CARD_CONFIG[name] || DEFAULT_CARD_CONFIG;
      return { label: name, value: count, ...config };
    }),
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
      {statItems.map((item) => (
        <div key={item.label} className="clay-card p-3 card-hover relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-1 h-full ${item.color}`} />
          <div className="pl-2">
            <div className={`${item.iconColor} mb-1.5 opacity-70`}>
              {item.icon}
            </div>
            <div className="text-xl font-semibold text-foreground tracking-tight">
              {(item.value ?? 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{item.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
