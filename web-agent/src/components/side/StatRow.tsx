import { cn } from "@/lib/utils";

export function StatRow({
  label,
  value,
  hint,
  mono = false,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-3 text-sm",
        className,
      )}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">
        <span className={cn("font-medium", mono && "font-mono tabular-nums")}>
          {value}
        </span>
        {hint ? (
          <span className="ml-2 text-[13px] text-muted-foreground">{hint}</span>
        ) : null}
      </span>
    </div>
  );
}
