import { getServiceStyle } from '@/lib/services';

export default function ServiceBadge({ name }: { name: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${getServiceStyle(name).badge}`}>
      {name}
    </span>
  );
}
