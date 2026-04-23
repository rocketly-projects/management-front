import Link from "next/link";

interface TopBarProps {
  title: string;
  subtitle?: string;
  primaryAction?: { label: string; href?: string; onClick?: string };
  secondaryAction?: { label: string; href?: string };
}

export default function TopBar({
  title,
  subtitle,
  primaryAction,
  secondaryAction,
}: TopBarProps) {
  return (
    <header className="flex items-center justify-between border-b border-card-border bg-white px-8 py-5">
      {/* Left: title + subtitle */}
      <div>
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        {subtitle && (
          <p className="mt-0.5 text-sm text-muted">{subtitle}</p>
        )}
      </div>

      {/* Right: actions + bell */}
      <div className="flex items-center gap-3">
        {secondaryAction && (
          <Link
            href={secondaryAction.href ?? "#"}
            className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-gray-50"
          >
            {secondaryAction.label}
          </Link>
        )}
        {primaryAction && (
          <Link
            href={primaryAction.href ?? "#"}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            {primaryAction.label}
          </Link>
        )}
        <button
          type="button"
          className="relative rounded-lg p-2 text-muted transition-colors hover:bg-gray-100 hover:text-foreground"
          aria-label="Notificaciones"
        >
          <IconBell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent" />
        </button>
      </div>
    </header>
  );
}

function IconBell({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={1.5}>
      <path d="M10 2a6 6 0 00-6 6v2.586l-1.707 1.707A1 1 0 003 14h14a1 1 0 00.707-1.707L16 10.586V8a6 6 0 00-6-6z" />
      <path d="M8 16a2 2 0 004 0" />
    </svg>
  );
}
