import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { LineChart } from "@mui/x-charts";
import {
  GaugeContainer,
  gaugeClasses,
  GaugeReferenceArc,
  useGaugeState,
} from "@mui/x-charts/Gauge";
import MapComponent from "../components/MapComponent";
import type { SocketData } from "../utils/Socket";

const HISTORY_LIMIT = 120;
const SPEEDOMETER_MAX_MPH = 90;

const chartSx = {
  ".MuiChartsAxis-root .MuiChartsAxis-line": {
    stroke: "rgba(255,255,255,0.2)",
  },
  ".MuiChartsAxis-tickLabel": {
    fill: "rgba(255,255,255,0.72)",
    fontSize: 11,
  },
  ".MuiChartsGrid-line": {
    stroke: "rgba(255,255,255,0.08)",
  },
};

type RunAverageState = {
  average: number | null;
  sampleCount: number;
};

type RunSessionState = {
  startTimestamp: number | null;
  isRunning: boolean;
};

export default function InteractiveGrid({ data }: { data: SocketData[] }) {
  const history = useMemo(() => data.slice(-HISTORY_LIMIT), [data]);
  const latest = history[history.length - 1] ?? null;
  const latestTimestamp = latest?.global_ts ?? null;
  const latestSpeed = latest?.gps.speed ?? 0;
  const latestPowerKw = latest ? calculatePowerKilowatts(latest) : 0;
  const instantEfficiency = latest ? calculateEfficiency(latest) : null;
  const [runSession, setRunSession] = useState<RunSessionState>({
    startTimestamp: null,
    isRunning: false,
  });

  const speedHistory = history.map((sample) => roundTo(sample.gps.speed, 1));
  const powerHistory = history.map((sample) =>
    roundTo(calculatePowerKilowatts(sample), 2),
  );
  const xAxisLabels = history.map((sample) =>
    formatElapsed(history[0]?.global_ts ?? sample.global_ts, sample.global_ts),
  );
  const runAverage = useMemo<RunAverageState | null>(() => {
    const startTimestamp = runSession.startTimestamp;

    if (startTimestamp === null) {
      return null;
    }

    const samples = data
      .filter((sample) => sample.global_ts >= startTimestamp)
      .map(calculateEfficiency)
      .filter((value): value is number => value !== null);

    if (samples.length === 0) {
      return {
        average: null,
        sampleCount: 0,
      };
    }

    let average = samples[0];

    for (let index = 1; index < samples.length; index += 1) {
      average += (samples[index] - average) / (index + 1);
    }

    return {
      average,
      sampleCount: samples.length,
    };
  }, [data, runSession.startTimestamp]);

  const toggleRunTracking = async () => {
    if (latestTimestamp === null) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8000/bag/${runSession.isRunning ? "stop" : "start"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      setRunSession((previous) => {
        if (previous.isRunning) {
          return {
            startTimestamp: null,
            isRunning: false,
          };
        }

        return {
          startTimestamp: latestTimestamp,
          isRunning: true,
        };
      });

      if (!response.ok) {
        throw new Error("Network response was not ok for ROS bag endpoint");
      }

      const result = await response.json();
      console.log("Success:", result);
    } catch (error) {
      console.error("Error occurred while fetching data:", error);
    }
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-[1600px] flex-col text-white">
      <div className="grid h-full grid-cols-1 gap-3 lg:grid-cols-12 lg:grid-rows-[minmax(0,0.9fr)_minmax(0,1fr)]">
        <DashboardCard
          className="min-h-[170px] lg:col-span-4 lg:row-start-1"
          title="Speed"
        >
          <div className="flex h-full items-center justify-between gap-3">
            <GaugeContainer
              width={180}
              height={180}
              startAngle={-110}
              endAngle={110}
              value={Math.max(0, Math.min(latestSpeed, SPEEDOMETER_MAX_MPH))}
              sx={() => ({
                [`& .${gaugeClasses.referenceArc}`]: {
                  fill: "rgba(255,255,255,0.16)",
                },
              })}
            >
              <GaugeReferenceArc />
              <GaugePointer />
            </GaugeContainer>
            <div className="flex min-w-0 flex-1 flex-col items-end text-right">
              <strong className="text-5xl font-semibold leading-none text-white xl:text-6xl">
                {formatValue(latestSpeed, 1)}
              </strong>
              <span className="mt-1 text-sm uppercase tracking-[0.2em] text-white/55">
                MPH
              </span>
              <span className="mt-4 text-xs text-white/45">
                Filtered {formatValue(latest?.filtered.speed ?? 0, 1)}
              </span>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard
          className="min-h-[170px] lg:col-span-4 lg:row-start-1"
          title="Efficiency"
        >
          <div className="flex h-full flex-col justify-between gap-3">
            <div className="grid grid-cols-2 gap-2">
              <MetricPanel
                label="Instantaneous"
                value={formatEfficiency(instantEfficiency)}
                helper="mi/kWh"
              />
              <MetricPanel
                label="Recording efficiency"
                value={
                  runAverage?.sampleCount
                    ? formatEfficiency(runAverage.average)
                    : "--"
                }
                helper={
                  runAverage?.sampleCount
                    ? `${runAverage.sampleCount} samples`
                    : "recorder idle"
                }
              />
            </div>
            <div className="flex items-center justify-between gap-2 rounded-[0.95rem] border border-white/8 bg-white/4 px-3 py-2.5">
              <div className="text-xs uppercase tracking-[0.2em] text-white/48">
                {formatValue(latestPowerKw, 2)} kW
              </div>
              <strong className="text-5xl font-semibold leading-none text-white xl:text-6xl">
                {formatValue(latestTimestamp, 1)}
              </strong>
              <button
                type="button"
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                  runSession.isRunning
                    ? "border-[#ef4444] bg-[#ef4444]/12 text-[#ffd0d0] hover:bg-[#ef4444]/18"
                    : "border-[#22c55e] bg-[#22c55e]/12 text-[#dcffe9] hover:bg-[#22c55e]/18"
                }`}
                onClick={toggleRunTracking}
              >
                {runSession.isRunning ? "Stop" : "Start"}
              </button>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard className="min-h-[170px] lg:col-span-4 lg:row-start-1">
          <MapComponent
            latitude={latest?.gps.lat ?? null}
            longitude={latest?.gps.long ?? null}
            className="min-h-0"
          />
        </DashboardCard>

        <DashboardCard
          className="min-h-[220px] lg:col-span-5 lg:row-start-2"
          title="Speed v. Time"
        >
          {history.length > 0 ? (
            <CompactChart
              accentColor="#fb923c"
              currentValue={`${formatValue(latestSpeed, 1)} mph`}
              data={speedHistory}
              labels={xAxisLabels}
              yMax={Math.max(90, Math.ceil(latestSpeed / 10) * 10)}
            />
          ) : (
            <EmptyTelemetryState compact />
          )}
        </DashboardCard>

        <DashboardCard
          className="min-h-[220px] lg:col-span-3 lg:row-start-2"
          title="Signals"
        >
          <div className="grid h-full grid-cols-2 gap-2">
            <SignalTile
              label="Brake"
              value={formatValue(latest?.steering.brake_pressure ?? 0, 1)}
            />
            <SignalTile
              label="Steer"
              value={`${formatValue(latest?.steering.turn_angle ?? 0, 1)} deg`}
            />
            <SignalTile
              label="Throttle"
              value={`${formatThrottle(latest?.motor.throttle ?? 0)}%`}
            />
            <SignalTile
              label="Filtered speed"
              value={`${formatValue(latest?.filtered.speed ?? 0, 1)} mph`}
            />
          </div>
        </DashboardCard>

        <DashboardCard
          className="min-h-[220px] lg:col-span-4 lg:row-start-2"
          title="Power v. Time"
        >
          {history.length > 0 ? (
            <CompactChart
              accentColor="#22c55e"
              currentValue={`${formatValue(latestPowerKw, 2)} kW`}
              data={powerHistory}
              labels={xAxisLabels}
            />
          ) : (
            <EmptyTelemetryState compact />
          )}
        </DashboardCard>
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  className = "",
  children,
}: {
  title?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden rounded-[1.25rem] border border-white/8 bg-[linear-gradient(180deg,rgba(32,44,56,0.96),rgba(16,24,32,0.98))] p-3 shadow-[0_18px_40px_rgba(0,0,0,0.24)] ${className}`}
    >
      {title ? (
        <div className="mb-2 flex items-center justify-between text-left">
          <h2 className="text-sm font-semibold uppercase tracking-[0.26em] text-white/78">
            {title}
          </h2>
        </div>
      ) : null}
      {children}
    </section>
  );
}

function MetricPanel({
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
      <div className="mt-2 text-2xl font-semibold leading-none text-white xl:text-3xl">
        {value}
      </div>
      <div className="mt-1 text-xs text-white/55">{helper}</div>
    </div>
  );
}

function SignalTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-0 flex-col justify-between rounded-[0.95rem] border border-white/8 bg-white/4 px-3 py-2.5 text-left">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold leading-tight text-white xl:text-xl">
        {value}
      </div>
    </div>
  );
}

function EmptyTelemetryState({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`flex h-full items-center justify-center rounded-[1rem] border border-dashed border-white/12 bg-black/14 px-4 text-center text-sm text-white/52 ${compact ? "min-h-[140px]" : "min-h-[220px]"}`}
    >
      Waiting for live ROS telemetry from the backend websocket.
    </div>
  );
}

function CompactChart({
  data,
  labels,
  currentValue,
  accentColor,
  yMax,
}: {
  data: number[];
  labels: string[];
  currentValue: string;
  accentColor: string;
  yMax?: number;
}) {
  const latestPointOnly = data.map((value, index) =>
    index === data.length - 1 ? value : null,
  );

  return (
    <div className="relative flex h-full min-h-0 flex-1">
      <div className="pointer-events-none absolute right-3 top-1 z-10 rounded-full border border-white/10 bg-black/55 px-2.5 py-1 text-xs font-medium text-white/88">
        {currentValue}
      </div>
      <LineChart
        margin={{ top: 8, right: 8, bottom: 10, left: 10 }}
        height={220}
        grid={{ horizontal: true }}
        disableAxisListener
        disableLineItemHighlight
        axisHighlight={{ x: "none", y: "none" }}
        slotProps={{ tooltip: { trigger: "none" } }}
        xAxis={[
          {
            scaleType: "point",
            data: labels,
            height: 16,
            tickLabelInterval: (_, index) => index % 20 === 0,
          },
        ]}
        yAxis={[{ min: 0, max: yMax, width: 30 }]}
        series={[
          {
            data,
            color: accentColor,
            showMark: false,
            area: true,
          },
          {
            data: latestPointOnly,
            color: accentColor,
            showMark: true,
            curve: "linear",
          },
        ]}
        sx={{
          ...chartSx,
          "& .MuiMarkElement-root": {
            fill: accentColor,
            stroke: "#ffffff",
            strokeWidth: 2,
            r: 4,
          },
          "& .MuiAreaElement-root": {
            fillOpacity: 0.2,
          },
        }}
      />
    </div>
  );
}

function GaugePointer() {
  const { valueAngle, outerRadius, cx, cy } = useGaugeState();

  if (valueAngle === null) {
    return null;
  }

  const target = {
    x: cx + outerRadius * Math.sin(valueAngle),
    y: cy - outerRadius * Math.cos(valueAngle),
  };
  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill="#fb923c" />
      <path
        d={`M ${cx} ${cy} L ${target.x} ${target.y}`}
        stroke="#fb923c"
        strokeWidth={3}
      />
    </g>
  );
}

function calculatePowerKilowatts(sample: SocketData): number {
  return Math.max(0, (sample.power.current * sample.power.voltage) / 1000);
}

function calculateEfficiency(sample: SocketData): number | null {
  const powerKw = calculatePowerKilowatts(sample);

  if (powerKw <= 0) {
    return null;
  }

  return sample.gps.speed / powerKw;
}

function formatElapsed(startTs: number, currentTs: number): string {
  const elapsedSeconds = Math.max(0, (currentTs - startTs) / 1000);

  if (elapsedSeconds < 60) {
    return `${Math.round(elapsedSeconds)}s`;
  }

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = Math.floor(elapsedSeconds % 60);

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatValue(value: number, decimals: number): string {
  return Number.isFinite(value) ? value.toFixed(decimals) : "--";
}

function formatEfficiency(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  return `${value.toFixed(2)} mi/kWh`;
}

function formatThrottle(value: number): string {
  const normalized = Math.abs(value) <= 1 ? value * 100 : value;
  return formatValue(normalized, 0);
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
