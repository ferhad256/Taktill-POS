import { cn } from "../../lib/utils";

/** Full Taktill wordmark logo. */
export function Logo({ className }: { className?: string }) {
  return (
    <img
      src="/logo.png"
      alt="Taktill"
      className={cn("h-9 w-auto object-contain", className)}
    />
  );
}

/** Compact mark for tight spaces (e.g. the collapsed sidebar rail). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-9 items-center justify-center rounded-lg bg-brand-500 text-lg font-bold text-white",
        className,
      )}
    >
      T
    </span>
  );
}
