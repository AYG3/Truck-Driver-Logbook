import type { DutySegment, DutyStatus } from "../../types/log";
import { DUTY_STATUS_LABELS } from "../../types/log";

interface LogSummaryTableProps {
  segments: DutySegment[];
  className?: string;
}

/**
 * Calculate total hours for a specific duty status
 */
function calculateHours(segments: DutySegment[], status: DutyStatus): number {
  const totalMs = segments
    .filter((seg) => seg.status === status)
    .reduce((sum, seg) => {
      const start = new Date(seg.start).getTime();
      const end = new Date(seg.end).getTime();
      return sum + (end - start);
    }, 0);

  return totalMs / (1000 * 60 * 60); // Convert ms to hours
}

export function LogSummaryTable({ segments, className = "" }: LogSummaryTableProps) {
  const statuses: DutyStatus[] = ["OFF_DUTY", "SLEEPER", "DRIVING", "ON_DUTY"];

  const totals = statuses.map((status) => ({
    status,
    label: DUTY_STATUS_LABELS[status],
    hours: calculateHours(segments, status),
  }));

  return (
    <div className={`bg-white border border-gray-300 rounded shadow-sm ${className}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-100 border-b border-gray-300">
            <th
              colSpan={2}
              className="px-3 py-2.5 text-center font-semibold text-gray-700 text-xs uppercase tracking-wide"
            >
              Total Hours For
            </th>
          </tr>
        </thead>
        <tbody>
          {totals.map(({ status, label, hours }) => (
            <tr key={status} className="border-b border-gray-200 last:border-0 hover:bg-gray-50 transition-colors">
              <td className="px-3 py-2.5 font-medium text-gray-700 text-sm">
                {label}
              </td>
              <td className="px-3 py-2.5 text-right text-gray-900 font-mono text-sm whitespace-nowrap">
                {hours.toFixed(2)} hrs
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
