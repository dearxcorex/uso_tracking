/** Display config per service / department — shared by stats cards, badges, and map pins */
export interface ColorStyle {
  hex: string;
  hexDark: string;
  bar: string;
  text: string;
  badge: string;
}

export const SCHOOL_SERVICE = 'Wi-Fi โรงเรียน';
export const VILLAGE_SERVICE = 'Wi-Fi หมู่บ้าน';

/** Department short codes, in display order */
export const DEPARTMENTS = ['อภ.', 'ตภ.', 'บภ.', 'ผภ.'];

export const DEPARTMENT_STYLES: Record<string, ColorStyle> = {
  'อภ.': {
    hex: '#10B981', hexDark: '#059669',
    bar: 'bg-emerald-500', text: 'text-emerald-500',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  'ตภ.': {
    hex: '#8B5CF6', hexDark: '#7C3AED',
    bar: 'bg-violet-500', text: 'text-violet-500',
    badge: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
  'บภ.': {
    hex: '#F59E0B', hexDark: '#D97706',
    bar: 'bg-amber-500', text: 'text-amber-500',
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  'ผภ.': {
    hex: '#F43F5E', hexDark: '#E11D48',
    bar: 'bg-rose-500', text: 'text-rose-500',
    badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  },
};

export const SERVICE_STYLES: Record<string, ColorStyle> = {
  [VILLAGE_SERVICE]: {
    hex: '#0EA5E9', hexDark: '#0284C7',
    bar: 'bg-sky-500', text: 'text-sky-500',
    badge: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  },
  [SCHOOL_SERVICE]: {
    hex: '#D946EF', hexDark: '#C026D3',
    bar: 'bg-fuchsia-500', text: 'text-fuchsia-500',
    badge: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400',
  },
};

export const DEFAULT_STYLE: ColorStyle = {
  hex: '#14B8A6', hexDark: '#0D9488',
  bar: 'bg-teal-500', text: 'text-teal-500',
  badge: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
};

export function getServiceStyle(serviceName: string): ColorStyle {
  return SERVICE_STYLES[serviceName] ?? DEFAULT_STYLE;
}

export function getDepartmentStyle(department: string): ColorStyle {
  return DEPARTMENT_STYLES[department] ?? DEFAULT_STYLE;
}

/** 'บริษัท โทรคมนาคมแห่งชาติ จำกัด (มหาชน) (CAT เดิม)' -> 'NT (CAT)' */
export function getProviderShort(name: string): string {
  if (name.includes('โทรคมนาคมแห่งชาติ')) {
    const legacy = name.match(/\((CAT|TOT) เดิม\)/);
    return legacy ? `NT (${legacy[1]})` : 'NT';
  }
  return name.length > 20 ? name.slice(0, 20) + '…' : name;
}
