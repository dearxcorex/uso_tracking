import { telHref } from '@/lib/points';

/** Tap-to-call link; stops propagation so it works inside clickable rows */
export default function PhoneLink({ phone, className = '' }: { phone: string; className?: string }) {
  return (
    <a
      href={telHref(phone)}
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1 min-h-11 font-mono text-primary! hover:underline whitespace-nowrap ${className}`}
    >
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
      {phone}
    </a>
  );
}
