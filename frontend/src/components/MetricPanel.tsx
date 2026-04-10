export default function MetricPanel({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-[0.95rem] border border-white/8 bg-black/18 px-3 py-2.5 text-left">
      <div className="text-[11px] uppercase tracking-[0.22em] text-white/42">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold leading-none text-white xl:text-3xl tabular-nums">
        {value}
      </div>
      <div className="mt-1 text-xs text-white/55">{helper}</div>
    </div>
  );
}
