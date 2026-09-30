import { getDepartmentStyle } from '@/lib/services';

/** Department code with optional visit order, e.g. 'อภ.3' */
export default function DepartmentBadge({ department, seq }: { department: string; seq?: number | null }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap ${getDepartmentStyle(department).badge}`}>
      {department}{seq ?? ''}
    </span>
  );
}
