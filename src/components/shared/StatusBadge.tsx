interface StatusBadgeProps {
  status: string;
  variant?: "default" | "success" | "warning" | "danger" | "info";
}

const statusVariantMap: Record<string, StatusBadgeProps["variant"]> = {
  // info (blue)
  scheduled: "info",
  pending: "info",
  "pending-review": "info",
  // success (green)
  confirmed: "success",
  active: "success",
  completed: "success",
  paid: "success",
  approved: "success",
  resolved: "success",
  // warning (amber)
  "in-progress": "warning",
  waiting: "warning",
  review: "warning",
  // danger (red)
  cancelled: "danger",
  declined: "danger",
  "no-show": "danger",
  missed: "danger",
  overdue: "danger",
  rejected: "danger",
  failed: "danger",
};

const variantStyles: Record<NonNullable<StatusBadgeProps["variant"]>, string> = {
  default: "bg-slate-100 text-slate-700",
  success: "bg-green-50 text-green-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
  info: "bg-blue-50 text-blue-700",
};

export default function StatusBadge({ status, variant }: StatusBadgeProps) {
  const resolvedVariant =
    variant ?? statusVariantMap[status.toLowerCase()] ?? "default";

  const displayLabel = status
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantStyles[resolvedVariant]}`}
    >
      {displayLabel}
    </span>
  );
}
