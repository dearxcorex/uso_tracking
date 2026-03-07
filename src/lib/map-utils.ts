/** Shorten full Thai provider names to display-friendly labels */
export function getProviderShort(name: string): string {
  if (name.includes('CAT')) return 'NT (CAT)';
  if (name.includes('TOT')) return 'NT (TOT)';
  if (name.includes('ทรู') || name.includes('True')) return 'True Move H';
  return name.length > 20 ? name.slice(0, 20) + '\u2026' : name;
}

/** Return Tailwind color class for a provider name (substring match) */
export function providerColor(provider: string): string {
  if (provider.includes('CAT')) return 'text-orange-600 dark:text-orange-400';
  if (provider.includes('TOT')) return 'text-violet-600 dark:text-violet-400';
  return 'text-rose-600 dark:text-rose-400';
}
