import type { ReactNode } from "react";

export default function DashboardCard({
  title,
  currentValue = "0.0 mph",
  className = "",
  children,
}: {
  title?: string;
  className?: string;
  currentValue?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`flex flex-col overflow-hidden rounded-[1.25rem] border border-white/8 bg-[linear-gradient(180deg,#242424,#252525)] p-3 shadow-[0_18px_40px_rgba(0,0,0,0.24)] ${className}`}
    >
      {title ? (
        <div className="mb-2 flex items-center justify-between text-left">
          <h2 className="text-sm font-semibold uppercase tracking-[0.26em] text-white/78">
            {title}
          </h2>
          <div className="pointer-events-none absolute right-3 top-1 z-10 rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-xs font-medium text-white/88">
            {currentValue}
          </div>
        </div>
      ) : null}
      {children}
    </section>
  );
}
