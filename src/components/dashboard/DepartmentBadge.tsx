import { getDepartmentStyle } from '@/lib/services';

/** Department code, e.g. 'อภ.' */
export default function DepartmentBadge({ department }: { department: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap ${getDepartmentStyle(department).badge}`}>
      {department}
    </span>
  );
}
