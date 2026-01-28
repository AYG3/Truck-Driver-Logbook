import type { TripStatus } from "../../types/trip";
import { STATUS_CONFIG } from "../../utils/constants";

interface StatusBadgeProps {
  status: TripStatus;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full ${config.color} ${sizeClasses[size]}`}
    >
      {status === "PROCESSING" && (
        <span className="h-1.5 w-1.5 bg-current rounded-full pulse-dot" />
      )}
      {config.label}
    </span>
  );
}
