'use client';

import React from 'react';
import { VisitStats } from '@/types';
import { DEFAULT_STYLE, DEPARTMENTS, SCHOOL_SERVICE, VILLAGE_SERVICE, getDepartmentStyle, getServiceStyle } from '@/lib/services';

interface StatsCardsProps {
  stats: VisitStats;
}

const ICONS = {
  point: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  department: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  [VILLAGE_SERVICE]: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
    </svg>
  ),
  [SCHOOL_SERVICE]: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
    </svg>
  ),
} as Record<string, React.ReactNode>;

export default function StatsCards({ stats }: StatsCardsProps) {
  const statItems = [
    { label: 'จุดลงพื้นที่ทั้งหมด', value: stats.total, bar: DEFAULT_STYLE.bar, text: DEFAULT_STYLE.text, icon: ICONS.point },
    ...DEPARTMENTS.map((dept) => {
      const style = getDepartmentStyle(dept);
      return { label: `หน่วยงาน ${dept}`, value: stats.byDepartment[dept] ?? 0, bar: style.bar, text: style.text, icon: ICONS.department };
    }),
    ...[SCHOOL_SERVICE, VILLAGE_SERVICE].map((name) => {
      const style = getServiceStyle(name);
      return { label: name, value: stats.byServiceName[name] ?? 0, bar: style.bar, text: style.text, icon: ICONS[name] };
    }),
  ];
  const rounds = Object.entries(stats.byRound).sort((a, b) => a[0].localeCompare(b[0], 'th', { numeric: true }));

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        {statItems.map((item) => (
          <div key={item.label} className="clay-card p-3 card-hover relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1 h-full ${item.bar}`} />
            <div className="pl-2">
              <div className={`${item.text} mb-1.5 opacity-70`}>
                {item.icon}
              </div>
              <div className="text-xl font-semibold text-foreground tracking-tight">
                {item.value.toLocaleString()}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{item.label}</div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        {rounds.map(([round, count]) => `${round} ${count} จุด`).join(' · ')}
        {` · ตรวจแล้ว ${stats.inspected}/${stats.total}`}
        {` · โรงเรียนมีเบอร์โทร ${stats.schoolsWithPhone}/${stats.schools}`}
        {stats.missingCoords > 0 && ` · ${stats.missingCoords} จุดยังไม่มีพิกัด (ไม่แสดงบนแผนที่)`}
      </p>
    </div>
  );
}
