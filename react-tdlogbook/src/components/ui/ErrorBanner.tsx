import { ExclamationTriangleIcon, XCircleIcon, CheckCircleIcon, InformationCircleIcon } from "@heroicons/react/24/outline";

type AlertType = "error" | "warning" | "success" | "info";

interface ErrorBannerProps {
  message: string;
  type?: AlertType;
  onDismiss?: () => void;
  className?: string;
}

const alertConfig: Record<AlertType, { bg: string; border: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
  error: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-800",
    icon: XCircleIcon,
  },
  warning: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    text: "text-yellow-800",
    icon: ExclamationTriangleIcon,
  },
  success: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-800",
    icon: CheckCircleIcon,
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-800",
    icon: InformationCircleIcon,
  },
};

export function ErrorBanner({ message, type = "error", onDismiss, className = "" }: ErrorBannerProps) {
  const config = alertConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={`${config.bg} ${config.border} border rounded-lg p-4 flex items-start gap-3 ${className}`}
      role="alert"
    >
      <Icon className={`h-5 w-5 ${config.text} flex-shrink-0 mt-0.5`} />
      <p className={`${config.text} text-sm flex-1`}>{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={`${config.text} hover:opacity-70 transition-opacity`}
          aria-label="Dismiss"
        >
          <XCircleIcon className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, icon: Icon, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      {Icon && (
        <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
          <Icon className="h-12 w-12" />
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-gray-500 mb-6 max-w-sm mx-auto">{description}</p>
      )}
      {action}
    </div>
  );
}
