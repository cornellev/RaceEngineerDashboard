import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { LineChart } from "@mui/x-charts";
import {
  Gauge,
  GaugeContainer,
  gaugeClasses,
  GaugeReferenceArc,
  useGaugeState,
} from "@mui/x-charts/Gauge";
import MapComponent from "../components/MapComponent";
import type { SocketData } from "../utils/Socket";
import { LinearProgress } from "@mui/material";

const HISTORY_LIMIT = 1200;
const SPEEDOMETER_MAX_MPH = 40;
const TIMESTAMP_UNITS_PER_SECOND = 1e6;
const HOURS_PER_SECOND = 1 / 3600;
const METERS_PER_MILE = 1609.344;
const WGS84_SEMI_MAJOR_AXIS = 6378137;
const WGS84_FLATTENING = 1 / 298.257223563;
const WGS84_ECCENTRICITY_SQUARED = WGS84_FLATTENING * (2 - WGS84_FLATTENING);

const chartSx = {
  ".MuiChartsAxis-root .MuiChartsAxis-line": {
    stroke: "rgba(255,255,255,0.2)",
  },
  ".MuiChartsAxis-root text": {
    fill: "rgba(255,255,255,0.78)",
  },
  ".MuiChartsAxis-tickLabel": {
    fill: "rgba(255,255,255,0.72)",
    fontSize: 11,
  },
  ".MuiChartsAxis-label": {
    fill: "rgba(255,255,255,0.82)",
  },
  ".MuiChartsGrid-line": {
    stroke: "rgba(255,255,255,0.08)",
  },
};

type RunAverageState = {
  average: number | null;
  sampleCount: number;
  lastProcessedTimestamp: number | null;
};

type RunSummaryState = {
  distanceMeters: number;
  energyKilowattHours: number;
  lastGpsLatitude: number | null;
  lastGpsLongitude: number | null;
  lastPowerKilowatts: number | null;
  lastSpeed: number | null;
  lapTimes: number[];
};

type RunSessionState = RunAverageState &
  RunSummaryState & {
    startTimestamp: number | null;
    isRunning: boolean;
  };

export default function InteractiveGrid({ data }: { data: SocketData[] }) {
  const history = useMemo(() => data.slice(-HISTORY_LIMIT), [data]);
  const latest = history[history.length - 1] ?? null;
  const latestTimestamp = latest?.global_ts ?? null;
  const latestSpeed = (latest?.filtered.speed ?? 0) * 2.23694;
  const latestPowerKw = latest ? calculatePowerKilowatts(latest) : 0;
  const instantEfficiency = latest ? calculateEfficiency(latest) : null;
  const [warn, setWarn] = useState<{
    value: boolean;
    message: string;
    timerId: number | null;
  }>({
    value: false,
    message: "",
    timerId: null,
  });
  const [disabled, setDisabled] = useState<number | null>(null);
  const [runSession, setRunSession] = useState<RunSessionState>({
    startTimestamp: null,
    isRunning: false,
    average: null,
    sampleCount: 0,
    lastProcessedTimestamp: null,
    distanceMeters: 0,
    energyKilowattHours: 0,
    lastGpsLatitude: null,
    lastGpsLongitude: null,
    lastPowerKilowatts: null,
    lastSpeed: null,
    lapTimes: [],
  });
  const runTimerTimestamp = runSession.isRunning
    ? latestTimestamp
    : runSession.lastProcessedTimestamp;
  const runTimerLabel =
    runSession.startTimestamp !== null && runTimerTimestamp !== null
      ? formatRunTimer(runSession.startTimestamp, runTimerTimestamp)
      : "0:00.0";
  const runDistanceMiles = metersToMiles(runSession.distanceMeters);
  const runEfficiencyRatio =
    runSession.energyKilowattHours > 0
      ? runDistanceMiles / runSession.energyKilowattHours
      : null;

  const speedHistory = history.map((sample) =>
    roundTo(sample.filtered.speed, 1),
  );
  const powerHistory = history.map((sample) =>
    roundTo(calculatePowerKilowatts(sample), 2),
  );
  const xAxisLabels = history.map((sample) => {
    return formatElapsed(
      sample.global_ts,
      history[history.length - 1]?.global_ts ?? sample.global_ts,
    );
  });
  useEffect(() => {
    if (!runSession.isRunning || runSession.lastProcessedTimestamp === null) {
      return;
    }

    const lastProcessedTimestamp = runSession.lastProcessedTimestamp;
    const incomingSamples = data.filter(
      (sample) => sample.global_ts > lastProcessedTimestamp,
    );

    if (incomingSamples.length === 0) {
      return;
    }

    setRunSession((previous) => {
      if (!previous.isRunning || previous.lastProcessedTimestamp === null) {
        return previous;
      }

      const previousLastProcessedTimestamp = previous.lastProcessedTimestamp;
      const pendingSamples = incomingSamples.filter(
        (sample) => sample.global_ts > previousLastProcessedTimestamp,
      );

      if (pendingSamples.length === 0) {
        return previous;
      }

      let average = previous.average;
      let sampleCount = previous.sampleCount;
      let lastProcessedTimestamp = previous.lastProcessedTimestamp;
      let distanceMeters = previous.distanceMeters;
      let energyKilowattHours = previous.energyKilowattHours;
      let lastGpsLatitude = previous.lastGpsLatitude;
      let lastGpsLongitude = previous.lastGpsLongitude;
      let lastPowerKilowatts = previous.lastPowerKilowatts;
      let lastSpeed = previous.lastSpeed;

      for (const sample of pendingSamples) {
        const currentTimestamp = sample.global_ts;
        const currentPowerKilowatts = calculatePowerKilowatts(sample);
        const elapsedHours =
          (Math.max(0, currentTimestamp - lastProcessedTimestamp) /
            TIMESTAMP_UNITS_PER_SECOND) *
          HOURS_PER_SECOND;

        if (lastPowerKilowatts !== null && elapsedHours > 0) {
          energyKilowattHours +=
            ((lastPowerKilowatts + currentPowerKilowatts) / 2) * elapsedHours;
        }

        lastSpeed = Math.max(sample.filtered.speed, lastSpeed ?? 0);
        lastPowerKilowatts = currentPowerKilowatts;

        const currentLatitude = sample.gps.lat;
        const currentLongitude = sample.gps.long;

        if (isValidGpsCoordinate(currentLatitude, currentLongitude)) {
          if (lastGpsLatitude !== null && lastGpsLongitude !== null) {
            distanceMeters += calculateLocalTangentDistanceMeters(
              lastGpsLatitude,
              lastGpsLongitude,
              currentLatitude,
              currentLongitude,
            );
          }

          lastGpsLatitude = currentLatitude;
          lastGpsLongitude = currentLongitude;
        }

        lastProcessedTimestamp = currentTimestamp;

        const efficiency = calculateEfficiency(sample);

        if (efficiency === null) {
          continue;
        }

        sampleCount += 1;
        average =
          average === null
            ? efficiency
            : average + (efficiency - average) / sampleCount;
      }

      return {
        ...previous,
        average,
        sampleCount,
        lastProcessedTimestamp,
        distanceMeters,
        energyKilowattHours,
        lastGpsLatitude,
        lastGpsLongitude,
        lastPowerKilowatts,
        lastSpeed,
      };
    });
  }, [data, runSession.isRunning, runSession.lastProcessedTimestamp]);

  const toggleRunTracking = async () => {
    if (disabled) clearTimeout(disabled);
    setDisabled(
      setTimeout(() => {
        setDisabled(null);
      }, 4000),
    );

    if (disabled) {
      const warnMessage = "Stop spamming the fucking buton";
      console.warn(warnMessage);
      if (warn.timerId) clearTimeout(warn.timerId);
      setWarn({
        value: true,
        message: warnMessage,
        timerId: setTimeout(() => {
          setWarn((prev) => {
            return { ...prev, value: false, timerId: null };
          });
        }, 1000),
      });
      return;
    }

    if (latestTimestamp === null && !runSession.isRunning) {
      console.warn("Cannot start run tracking without any telemetry data");
      if (warn.timerId) clearTimeout(warn.timerId);
      setWarn({
        value: true,
        message: "No data to record",
        timerId: setTimeout(() => {
          setWarn((prev) => {
            return { ...prev, value: false, timerId: null };
          });
        }, 1000),
      });
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
            ...previous,
            isRunning: false,
          };
        }

        const startingAverage = instantEfficiency;
        const startingLatitude = latest?.gps.lat ?? null;
        const startingLongitude = latest?.gps.long ?? null;
        const hasValidStartingGps =
          startingLatitude !== null &&
          startingLongitude !== null &&
          isValidGpsCoordinate(startingLatitude, startingLongitude);

        return {
          startTimestamp: latestTimestamp,
          isRunning: true,
          average: startingAverage,
          sampleCount: startingAverage === null ? 0 : 1,
          lastProcessedTimestamp: latestTimestamp,
          distanceMeters: 0,
          energyKilowattHours: 0,
          lastGpsLatitude: hasValidStartingGps ? startingLatitude : null,
          lastGpsLongitude: hasValidStartingGps ? startingLongitude : null,
          lastPowerKilowatts: latestPowerKw,
          lastSpeed: 0,
          lapTimes: [],
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

  const handleLap = () => {
    setRunSession((previous) => {
      let lapTimes = [
        ...previous.lapTimes,
        runSession.lastProcessedTimestamp ?? 0,
      ];

      return {
        ...previous,
        lapTimes,
      };
    });
  };

  return (
    <div className="grid min-h-full w-full text-white grid-cols-1 gap-3 lg:grid-cols-12 lg:grid-rows-[minmax(100,0.9fr)_minmax(100,1fr)] m-0 px-3 pt-2 pb-3.5 sm:px-4 lg:px-5">
      <DashboardCard
        className="min-h-42.5 lg:col-span-3 lg:row-start-1"
        title="Speed"
      >
        <div className="flex h-full flex-col justify-end gap-0 xl:gap-3">
          <div className="flex flex-wrap xl:flex-nowrap items-center justify-center">
            <GaugeContainer
              width={180}
              height={180}
              startAngle={-110}
              endAngle={110}
              value={
                Math.max(0, Math.min(latestSpeed, SPEEDOMETER_MAX_MPH)) *
                (100 / SPEEDOMETER_MAX_MPH)
              }
              sx={{ flexWrap: "wrap" }}
            >
              <GaugeReferenceArc />
              <GaugePointer />
            </GaugeContainer>
            <div className="flex flex-1 flex-col xl:items-end text-right items-center mb-3">
              <strong className="text-5xl font-semibold leading-none text-white 2xl:text-6xl font-mono">
                {formatValue(latestSpeed, 1)}
              </strong>
              <span className="mt-1 text-sm uppercase tracking-[0.2em] text-white/55">
                MPH
              </span>
            </div>
          </div>
          <div className="h-1/3">
            <MetricPanel
              label="Max"
              value={
                runSession.lastSpeed
                  ? `${formatValue(runSession.lastSpeed * 2.23694, 1)} mph`
                  : "--"
              }
              helper={`${runSession.isRunning ? "Recorder Active" : "start recording to track"}`}
            />
          </div>
        </div>
      </DashboardCard>

      <DashboardCard
        className="min-h-42.5 lg:col-span-5 lg:row-start-1"
        title="Run Summary"
      >
        <div className="flex h-full flex-col justify-between">
          <div className="grid grid-cols-2 gap-2">
            <MetricPanel
              label="Instant Efficiency"
              value={
                instantEfficiency
                  ? instantEfficiency >= 100
                    ? "MAX"
                    : `${formatEfficiency(instantEfficiency)}`
                  : "--"
              }
              helper={
                instantEfficiency
                  ? instantEfficiency >= 100
                    ? `${formatEfficiency(instantEfficiency)}`
                    : "mi/kWh"
                  : "no data to record"
              }
            />
            <MetricPanel
              label="Recording efficiency"
              value={
                runSession.energyKilowattHours > 0
                  ? formatEfficiency(runEfficiencyRatio)
                  : "--"
              }
              helper={
                runSession.energyKilowattHours > 0
                  ? runSession.isRunning
                    ? "distance / energy"
                    : "distance / energy (last run)"
                  : runSession.isRunning
                    ? "waiting for distance + energy"
                    : "start recording to track"
              }
            />
            <MetricPanel
              label="Distance"
              value={
                runSession.startTimestamp
                  ? formatDistanceMiles(runDistanceMiles)
                  : "--"
              }
              helper={
                runSession.startTimestamp !== null
                  ? runSession.isRunning
                    ? "local tangent plane"
                    : "last recorded run"
                  : "start recording to track"
              }
            />
            <MetricPanel
              label="Energy Used"
              value={
                runSession.startTimestamp
                  ? formatEnergyWattHours(runSession.energyKilowattHours * 1000)
                  : "--"
              }
              helper={
                runSession.startTimestamp !== null
                  ? runSession.isRunning
                    ? "trapezoid estimate"
                    : "last recorded run"
                  : "start recording to track"
              }
            />
          </div>
          {runSession.lapTimes.length >= 1 ? (
            <div className="flex justify-start w-full">
              <h2 className="text-sm font-semibold uppercase tracking-[0.26em] text-white/78">
                Laps
              </h2>
              <div className="flex justify-start flex-row-reverse overflow-x-scroll [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {calculateLapTimes(runSession.lapTimes).map((lapTime) => {
                  return (
                    <p
                      className={`text-sm font-semibold uppercase tracking-[0.26em] text-${lapTime.color}-700 ml-3`}
                    >
                      {formatRunTimer(0, lapTime.value).slice(0, -2)}{" "}
                    </p>
                  );
                })}
              </div>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-0 sm:gap-2 rounded-[0.95rem] border border-white/8 bg-white/4 px-3 py-2.5">
            <strong className="text-3xl font-semibold leading-none text-white sm:5xl xl:text-6xl font-mono">
              {runTimerLabel}
            </strong>
            {runSession.isRunning ? null : (
              <p
                className={`transition-opacity text-white/55 wrap text-center hidden overflow-x-scroll [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:block duration-1000 ease-in-out ${warn.value ? "opacity-100" : "opacity-0"}`}
              >
                {warn.message}
              </p>
            )}
            <div>
              {runSession.isRunning ? (
                <button
                  className={`rounded-full focus:outline-0 border px-3 mr-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition`}
                  onClick={handleLap}
                >
                  Lap
                </button>
              ) : null}
              <button
                type="button"
                className={`rounded-full focus:outline-0 border px-3 ml-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition`}
                onClick={toggleRunTracking}
              >
                {runSession.isRunning ? "Stop" : "Start"}
              </button>
            </div>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard className="min-h-42.5 lg:col-span-4 lg:row-start-1">
        <MapComponent
          latitude={latest?.gps.lat ?? null}
          longitude={latest?.gps.long ?? null}
          className="min-h-0"
        />
      </DashboardCard>

      <DashboardCard
        className="min-h-55 lg:col-span-5 lg:row-start-2"
        title="Speed v. Time"
      >
        {history.length > 0 ? (
          <CompactChart
            accentColor="#fb923c"
            currentValue={`${formatValue(latestSpeed, 1)} mph`}
            data={speedHistory.map((speed) => roundTo(speed * 2.23694, 1))}
            labels={xAxisLabels}
            yMax={Math.max(
              SPEEDOMETER_MAX_MPH,
              Math.ceil((latestSpeed * 2.23694) / 10) * 10,
            )}
          />
        ) : (
          <EmptyTelemetryState compact />
        )}
      </DashboardCard>

      <DashboardCard
        className="min-h-55 lg:col-span-3 lg:row-start-2"
        title="Signals"
      >
        <div className="grid h-full grid-cols-2 gap-2">
          <SignalTile
            label="Brake"
            value={`${Math.round(latest?.steering.brake_pressure ?? 0)} PSI`}
          >
            <LinearProgress
              variant="determinate"
              value={Math.min(
                latest?.steering.brake_pressure
                  ? latest.steering.brake_pressure / 6
                  : 0,
                100,
              )}
              sx={{
                height: 10,
                borderRadius: 2,
              }}
            />
          </SignalTile>
          <SignalTile label="Steer">
            <div className="h-4/5">
              <Gauge
                value={
                  latest?.steering.turn_angle
                    ? 50 + (latest.steering.turn_angle - 1200) / 100
                    : 50
                }
                startAngle={-110}
                endAngle={110}
                sx={{
                  [`& .${gaugeClasses.referenceArc}`]: {
                    fill: "#48657C",
                  },
                  [`& .${gaugeClasses.valueArc}`]: {
                    fill: "#90CAF9",
                  },
                  [`& .${gaugeClasses.valueText}`]: {
                    fontFamily: "Chivo Mono",
                    fontWeight: 500,
                    fontSize: 22,
                    transform: "translate(0px, 0px)",
                  },
                  [`& .${gaugeClasses.valueText} text`]: {
                    fill: "white",
                  },
                }}
                text={() =>
                  `${Math.round(latest?.steering.turn_angle ? (latest.steering.turn_angle - 1200) / 100 : 0)}°`
                }
                skipAnimation
              />
            </div>
          </SignalTile>
          <SignalTile
            label="Throttle"
            value={`${formatThrottle(latest?.motor.throttle ?? 0)}%`}
          >
            <div className="h-full">
              <VerticalThrottle
                value={Math.min(latest?.motor.throttle ?? 0, 100)}
              />
            </div>
          </SignalTile>
          <SignalTile label="RPM">
            <div className="h-9/10 grid grid-rows-2 grid-cols-2 gap-3">
              <SignalTile
                label="FL"
                value={`${latest?.rpm_front.rpm_left ? Math.round(latest.rpm_front.rpm_left) : 0}`}
              />
              <SignalTile
                label="FR"
                value={`${latest?.rpm_front.rpm_right ? Math.round(latest.rpm_front.rpm_right) : 0}`}
              />
              <SignalTile
                label="BL"
                value={`${latest?.rpm_back.rpm_left ? Math.round(latest.rpm_back.rpm_left) : 0}`}
              />
              <SignalTile
                label="BR"
                value={`${latest?.rpm_back.rpm_right ? Math.round(latest.rpm_back.rpm_right) : 0}`}
              />
            </div>
          </SignalTile>
        </div>
      </DashboardCard>

      <DashboardCard
        className="min-h-55 lg:col-span-4 lg:row-start-2"
        title="Power v. Time"
      >
        {history.length > 0 ? (
          <CompactChart
            accentColor="#22c55e"
            currentValue={`${formatValue(latestPowerKw, 2)} kW`}
            data={powerHistory}
            labels={xAxisLabels}
            yMax={4.5}
          />
        ) : (
          <EmptyTelemetryState compact />
        )}
      </DashboardCard>
    </div>
  );
}

function DashboardCard({
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
      className={`flex min-h-90 flex-col overflow-hidden rounded-[1.25rem] border border-white/8 bg-[linear-gradient(180deg,#242424,#252525)] p-3 shadow-[0_18px_40px_rgba(0,0,0,0.24)] ${className}`}
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

function SignalTile({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-col justify-between rounded-[0.95rem] border border-white/8 bg-white/4 px-3 py-2.5 text-left">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">
        {label}
      </div>
      {children}
      {value ? (
        <div className="mt-2 text-lg font-semibold leading-tight text-white xl:text-xl font-mono">
          {value}
        </div>
      ) : null}
    </div>
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
      <div className="mt-2 text-2xl font-semibold leading-none text-white xl:text-3xl font-mono">
        {value}
      </div>
      <div className="mt-1 text-xs text-white/55">{helper}</div>
    </div>
  );
}

function EmptyTelemetryState({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`flex h-full items-center justify-center rounded-2xl border border-dashed border-white/12 bg-black/14 px-4 text-center text-sm text-white/52 ${compact ? "min-h-35" : "min-h-55"}`}
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
      <div className="pointer-events-none absolute right-3 top-1 z-10 rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-xs font-medium text-white/88">
        {currentValue}
      </div>
      <LineChart
        margin={{ top: 8, right: 8, bottom: 10, left: 10 }}
        height={220}
        grid={{ horizontal: true }}
        xAxis={[
          {
            scaleType: "point",
            data: labels,
            height: 16,
            tickLabelInterval: (_, index) => index % 20 === 0,
            tickInterval: (_, index) => index % 20 === 0,
            disableLine: true,
            disableTicks: true,
          },
        ]}
        yAxis={[{ min: 0, max: yMax, width: 30, disableTicks: true }]}
        series={[
          {
            data,
            color: accentColor,
            showMark: false,
            area: true,
            valueFormatter: (value) => `${value} ${currentValue.split(" ")[1]}`,
          },
          {
            data: latestPointOnly,
            color: accentColor,
            showMark: true,
            curve: "linear",
            valueFormatter: () => null,
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
        slotProps={{
          tooltip: {
            sx: {
              "& .MuiChartsTooltip-table": {
                backgroundColor: "#1e1e1e",
              },
            },
          },
        }}
        skipAnimation
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
      <circle cx={cx} cy={cy} r={5} fill="#c41e3a" />
      <path
        d={`M ${cx} ${cy} L ${target.x} ${target.y}`}
        stroke="#c41e3a"
        strokeWidth={3}
      />
    </g>
  );
}

function VerticalThrottle({ value }: { value: number }) {
  return (
    <div
      style={{
        width: 120,
        marginTop: "min(0.7vh,0.4vw)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <LinearProgress
        variant="determinate"
        value={Math.min(value, 100)}
        sx={{
          height: 30,
          width: "100%", // becomes height after rotation
          transform: "translateX(-120px) rotate(-90deg)",
          transformOrigin: "top right",
          borderRadius: "10px",
        }}
      />
    </div>
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

  return (sample.filtered.speed * 2.23694) / powerKw;
}

function calculateLapTimes(
  lapTimestamps: number[],
): { value: number; color: string }[] {
  if (lapTimestamps.length === 0) return [];
  let lapTimes = [{ value: lapTimestamps[0], color: "gray" }];
  for (let i = 1; i < lapTimestamps.length; i++) {
    const value = lapTimestamps[i] - lapTimestamps[i - 1];
    const color = value > lapTimes[lapTimes.length - i].value ? "green" : "red";
    lapTimes = [{ value: value, color: color }, ...lapTimes];
  }
  return lapTimes;
}

function calculateLocalTangentDistanceMeters(
  originLatitude: number,
  originLongitude: number,
  targetLatitude: number,
  targetLongitude: number,
): number {
  const origin = geodeticToEcef(originLatitude, originLongitude);
  const target = geodeticToEcef(targetLatitude, targetLongitude);
  const deltaX = target.x - origin.x;
  const deltaY = target.y - origin.y;
  const deltaZ = target.z - origin.z;
  const originLatitudeRadians = degreesToRadians(originLatitude);
  const originLongitudeRadians = degreesToRadians(originLongitude);
  const east =
    -Math.sin(originLongitudeRadians) * deltaX +
    Math.cos(originLongitudeRadians) * deltaY;
  const north =
    -Math.sin(originLatitudeRadians) *
      Math.cos(originLongitudeRadians) *
      deltaX -
    Math.sin(originLatitudeRadians) *
      Math.sin(originLongitudeRadians) *
      deltaY +
    Math.cos(originLatitudeRadians) * deltaZ;

  return Math.hypot(east, north);
}

function geodeticToEcef(latitude: number, longitude: number) {
  const latitudeRadians = degreesToRadians(latitude);
  const longitudeRadians = degreesToRadians(longitude);
  const sinLatitude = Math.sin(latitudeRadians);
  const cosLatitude = Math.cos(latitudeRadians);
  const sinLongitude = Math.sin(longitudeRadians);
  const cosLongitude = Math.cos(longitudeRadians);
  const radiusOfCurvature =
    WGS84_SEMI_MAJOR_AXIS /
    Math.sqrt(1 - WGS84_ECCENTRICITY_SQUARED * sinLatitude ** 2);

  return {
    x: radiusOfCurvature * cosLatitude * cosLongitude,
    y: radiusOfCurvature * cosLatitude * sinLongitude,
    z: radiusOfCurvature * (1 - WGS84_ECCENTRICITY_SQUARED) * sinLatitude,
  };
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function isValidGpsCoordinate(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude !== 0 &&
    longitude !== 0
  );
}

function metersToMiles(value: number): number {
  return value / METERS_PER_MILE;
}

function formatElapsed(startTs: number, currentTs: number): string {
  const elapsedSeconds = Math.max(
    0,
    (currentTs - startTs) / TIMESTAMP_UNITS_PER_SECOND,
  );

  if (elapsedSeconds < 60) {
    return `${Math.round(elapsedSeconds)}s`;
  }

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = Math.floor(elapsedSeconds % 60);

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatRunTimer(startTs: number, currentTs: number): string {
  const elapsedSeconds = Math.max(
    0,
    (currentTs - startTs) / TIMESTAMP_UNITS_PER_SECOND,
  );
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds - minutes * 60;

  return `${minutes}:${seconds.toFixed(1).padStart(4, "0")}`;
}

function formatDistanceMiles(value: number): string {
  return Number.isFinite(value) ? `${value.toFixed(3)} mi` : "--";
}

function formatEnergyWattHours(value: number): string {
  return Number.isFinite(value) ? `${value.toFixed(3)} Wh` : "--";
}

function formatValue(value: number, decimals: number): string {
  return Number.isFinite(value) ? value.toFixed(decimals) : "--";
}

function formatEfficiency(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "0.00 mi/kWh";
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
