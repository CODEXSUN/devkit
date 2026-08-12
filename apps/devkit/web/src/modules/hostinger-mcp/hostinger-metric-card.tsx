import type { ComponentType } from "react";
import type { HostingerMetric } from "./hostinger-mcp.types";

type Props = {
  format: (value: number) => string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  metric: HostingerMetric;
  primaryValue?: string;
  secondaryText?: string;
  visual?: "gauge" | "trend";
};

export function HostingerMetricCard({
  format,
  href,
  icon: Icon,
  label,
  metric,
  primaryValue,
  secondaryText,
  visual = "trend"
}: Props) {
  return (
    <a
      className="flex min-h-32 flex-col justify-between rounded-xl border bg-card p-4 transition-transform hover:-translate-y-0.5 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      href={href}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <Icon className="size-4 text-primary" />
      </div>
      <div className="flex items-end justify-between gap-4 pt-5">
        <div>
          <strong className="text-2xl font-semibold tracking-tight">
            {primaryValue ?? format(metric.current)}
          </strong>
          {secondaryText || metric.percent !== null ? (
            <span className="block pt-1 text-xs text-muted-foreground">
              {secondaryText ?? `${metric.percent?.toFixed(1)}% of capacity`}
            </span>
          ) : null}
        </div>
        {visual === "gauge" ? (
          <UsageGauge percent={metric.percent ?? 0} />
        ) : (
          <Sparkline values={metric.points.map((point) => point.value)} />
        )}
      </div>
    </a>
  );
}

function UsageGauge({ percent }: { percent: number }) {
  const normalized = Math.max(0, Math.min(100, percent));
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg
      aria-label={`${normalized.toFixed(1)}% used`}
      className="size-14 -rotate-90"
      viewBox="0 0 56 56"
    >
      <circle className="stroke-muted" cx="28" cy="28" fill="none" r={radius} strokeWidth="6" />
      <circle
        className="stroke-primary transition-all"
        cx="28"
        cy="28"
        fill="none"
        r={radius}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - normalized / 100)}
        strokeLinecap="round"
        strokeWidth="6"
      />
    </svg>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const minimum = Math.min(...values);
  const range = Math.max(1, Math.max(...values) - minimum);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 96;
      const y = 30 - ((value - minimum) / range) * 24;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg aria-hidden="true" className="h-9 w-24 overflow-visible" viewBox="0 0 96 36">
      <polyline
        className="stroke-primary"
        fill="none"
        points={points}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
