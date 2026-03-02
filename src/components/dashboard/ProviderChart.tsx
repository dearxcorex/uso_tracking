'use client';

interface ProviderChartProps {
  byProvider: Record<string, number>;
  total: number;
}

const providerColorList: { match: (name: string) => boolean; short: string; style: { bg: string; text: string; hex: string } }[] = [
  { match: (n) => n.includes('CAT'), short: 'NT (CAT)', style: { bg: 'bg-orange-500', text: 'text-orange-500 dark:text-orange-400', hex: '#f97316' } },
  { match: (n) => n.includes('TOT'), short: 'NT (TOT)', style: { bg: 'bg-violet-500', text: 'text-violet-500 dark:text-violet-400', hex: '#8b5cf6' } },
  { match: (n) => n.includes('ทรู') || n.includes('True'), short: 'True Move H', style: { bg: 'bg-rose-500', text: 'text-rose-500 dark:text-rose-400', hex: '#f43f5e' } },
];

const defaultColor = { bg: 'bg-slate-500', text: 'text-slate-500 dark:text-slate-400', hex: '#64748b' };

function getProviderInfo(name: string) {
  const found = providerColorList.find((p) => p.match(name));
  return {
    color: found?.style ?? defaultColor,
    shortName: found?.short ?? name,
  };
}

export default function ProviderChart({ byProvider, total }: ProviderChartProps) {
  const entries = Object.entries(byProvider).sort((a, b) => b[1] - a[1]);

  // Build donut segments
  let cumulativePct = 0;
  const segments = entries.map(([name, count]) => {
    const pct = total > 0 ? (count / total * 100) : 0;
    const start = cumulativePct;
    cumulativePct += pct;
    return { name, count, pct, start };
  });

  const gradientParts = segments.map((seg) => {
    const { color } = getProviderInfo(seg.name);
    return `${color.hex} ${seg.start}% ${seg.start + seg.pct}%`;
  });
  const gradient = `conic-gradient(${gradientParts.join(', ')})`;

  return (
    <div className="clay-card p-5">
      <h3 className="text-sm font-semibold text-foreground mb-5">
        ผู้ให้บริการ
      </h3>

      {/* Desktop: row layout / Mobile: column layout */}
      <div className="flex flex-col sm:flex-row items-center gap-5">
        {/* Donut */}
        <div className="relative flex-shrink-0">
          <div
            className="w-24 h-24 rounded-full"
            style={{
              background: gradient,
              mask: 'radial-gradient(circle, transparent 58%, black 59%)',
              WebkitMask: 'radial-gradient(circle, transparent 58%, black 59%)',
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-base font-semibold text-foreground">{total.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground">total</div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 w-full space-y-2.5">
          {entries.map(([name, count]) => {
            const { color, shortName } = getProviderInfo(name);
            const pct = total > 0 ? (count / total * 100) : 0;
            return (
              <div key={name}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-sm shrink-0 ${color.bg}`} />
                    <span className={`text-sm font-medium truncate ${color.text}`} title={name}>
                      {shortName}
                    </span>
                  </div>
                  <div className="text-right font-mono whitespace-nowrap ml-2">
                    <span className="text-sm font-medium text-foreground">{count.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground ml-1">({pct.toFixed(1)}%)</span>
                  </div>
                </div>
                {/* Mini progress bar */}
                <div className="mt-1 h-1 rounded-full bg-secondary overflow-hidden ml-[18px]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: color.hex }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
