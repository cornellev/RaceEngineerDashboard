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
  const currentHistory = history.map((sample) =>
    roundTo(sample.power.current, 1),
  );
  const xAxisLabels = history.map((_, index) => {
    return index.toString();
  });
  const xAxisTimestamps = history.map((sample) => {
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
      const warnMessage = "Stop spamming the fucking button";
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
    <div className="grid min-h-full w-full text-white grid-cols-1 gap-3 lg:grid-cols-12 lg:grid-rows-[minmax(100,1fr)_minmax(100,1fr)] m-0 px-3 pt-2 pb-3.5 sm:px-4 lg:px-5">
      <DashboardCard
        className="min-h-42.5 lg:min-h-100 lg:col-span-3 lg:row-start-1 auto-rows-fr"
        title="Speed"
      >
        <div className="flex h-full max-h-full flex-col justify-end gap-0 xl:gap-3">
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
              <strong className="text-5xl lg:text-4xl font-semibold leading-none text-white 2xl:text-6xl tabular-nums">
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
        className="min-h-42.5 lg:min-h-100 lg:col-span-5 lg:row-start-1"
        title={`Run Summary${latest?.latency_ms ? ` | Latency [${Math.round(Math.abs(latest.latency_ms))}ms]` : ""}`}
      >
        <div className="flex h-full flex-col justify-between gap-4 lg:gap-2">
          <div className="grid grid-cols-2 gap-3">
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
                  : "no data to display"
              }
            />
            <MetricPanel
              label="Average Efficiency"
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
            <div className="flex justify-start w-full px-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.26em] text-white/78">
                Laps
              </h2>
              <div className="flex justify-start flex-row-reverse overflow-x-scroll [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {calculateLapTimes(
                  runSession.lapTimes,
                  runSession.startTimestamp ?? 0,
                  latestTimestamp ??
                    runSession.lapTimes[runSession.lapTimes.length - 1] ??
                    0,
                ).map((lapTime) => {
                  return (
                    <p
                      className={`text-sm font-semibold uppercase tracking-[0.26em] ${lapTime.color} ml-3`}
                    >
                      {formatRunTimer(0, lapTime.value).slice(0, -2)}{" "}
                    </p>
                  );
                })}
              </div>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-0 sm:gap-2 rounded-[0.95rem] border border-white/8 bg-white/4 px-3 py-2.5">
            <strong className="text-3xl font-semibold leading-none text-white sm:5xl 2xl:text-6xl tabular-nums">
              {runTimerLabel}
            </strong>
            <p
              className={`wrap text-sm text-white/55 text-center overflow-x-scroll hidden sm:block lg:hidden xl:block transition-opacity duration-1000 ease-in-out [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${warn.value ? "opacity-100" : "opacity-0"}`}
            >
              {warn.message}
            </p>
            <div className="flex justify-between items-center gap-3">
              {runSession.isRunning ? (
                <button
                  className={`rounded-full focus:outline-0 border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition`}
                  onClick={handleLap}
                >
                  Lap
                </button>
              ) : null}
              <button
                type="button"
                className={`rounded-full focus:outline-0 border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition`}
                onClick={toggleRunTracking}
              >
                {runSession.isRunning ? "Stop" : "Start"}
              </button>
            </div>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard className="min-h-200 lg:min-h-100 lg:col-span-4 lg:row-start-1 lg:row-span-2">
        <MapComponent
          latitude={latest?.gps.lat ?? null}
          longitude={latest?.gps.long ?? null}
          className="min-h-0"
        />
      </DashboardCard>

      <DashboardCard
        className="min-h-100 lg:min-h-55 lg:col-span-4 2xl:col-span-5 lg:row-start-2"
        title="Power and Speed"
      >
        {history.length > 0 ? (
          <CompactChart
            accentColor="#fb923c"
            currentValue={`${formatValue((speedHistory.reduce((accumulator, currentValue) => accumulator + currentValue) / (speedHistory.length > 0 ? speedHistory.length : 1)) * 2.23694, 1)} mph`}
            unit="mph"
            data={speedHistory.map((speed) => roundTo(speed * 2.23694, 1))}
            rawTimestamps={history.map((sample) => sample.global_ts)}
            timestamps={xAxisTimestamps}
            labels={xAxisLabels}
            yMax={Math.max(
              SPEEDOMETER_MAX_MPH,
              Math.ceil((latestSpeed * 2.23694) / 10) * 10,
            )}
            secondarySeries={{
              data: powerHistory,
              currentValue: `${formatValue(latestPowerKw, 2)} kW`,
              unit: "kW",
              accentColor: "#c41e3a99",
              yMax: Math.max(
                4.5,
                Math.ceil(Math.max(...powerHistory, latestPowerKw ?? 0)),
              ),
            }}
          />
        ) : (
          <EmptyTelemetryState compact />
        )}
      </DashboardCard>

      <DashboardCard
        className="min-h-100 lg:min-h-55 lg:col-span-4 2xl:col-span-3 lg:row-start-2"
        title="Signals"
      >
        <div className="grid h-full grid-cols-2 gap-3 rows-auto-fr">
          <SignalTile
            label="Throttle"
            value={`${formatThrottle(latest?.motor.throttle ?? 0)}%`}
          >
            <LinearProgress
              variant="determinate"
              value={Math.min(
                latest?.motor.throttle ? Math.abs(latest.motor.throttle) : 0,
                100,
              )}
              sx={{
                height: 10,
                borderRadius: 2,
              }}
            />
          </SignalTile>
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
          <SignalTile label="Power">
            <div className="grid grid-rows-2 gap-3 h-full rows-auto-fr">
              <SignalTile
                label="Current"
                value={`${formatValue(latest?.power.current ?? 0, 1)} A`}
              ></SignalTile>
              <SignalTile
                label="Voltage"
                value={`${formatValue(latest?.power.voltage ?? 0, 1)} V`}
              ></SignalTile>
            </div>
          </SignalTile>
          <SignalTile label="RPM">
            <div className="grid grid-rows-2 gap-3 h-full rows-auto-fr">
              <SignalTile
                label="Left"
                value={`${formatValue(latest?.rpm_back.rpm_left ?? 0, 0)}`}
              ></SignalTile>
              <SignalTile
                label="Right"
                value={`${formatValue(latest?.rpm_back.rpm_right ?? 0, 0)}`}
              ></SignalTile>
            </div>
          </SignalTile>
        </div>
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
    <div className="flex min-h-0 flex-col justify-between rounded-[0.95rem] border border-white/8 bg-white/4 px-3 py-2.5 text-left gap-1">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">
        {label}
      </div>
      {children}
      {value ? (
        <div className="mt-2 text-lg font-semibold leading-tight text-white xl:text-xl tabular-nums">
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
      <div className="mt-2 text-2xl font-semibold leading-none text-white xl:text-3xl tabular-nums">
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
  rawTimestamps,
  labels,
  timestamps,
  currentValue,
  unit,
  accentColor,
  yMax,
  secondarySeries,
}: {
  data: number[];
  rawTimestamps: number[];
  labels: string[];
  timestamps: string[];
  currentValue: string;
  unit: string;
  accentColor: string;
  yMax?: number;
  secondarySeries?: {
    data: number[];
    currentValue: string;
    unit: string;
    accentColor: string;
    yMax?: number;
  };
}) {
  const latestPointOnly = data.map((value, index) =>
    index === data.length - 1 ? value : null,
  );
  const secondaryLatestPointOnly = secondarySeries?.data.map((value, index) =>
    index === secondarySeries.data.length - 1 ? value : null,
  );
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const sparseTickValues = getSparseTickValues(labels);
  const formatTimestampLabel = (value: string) => {
    const index = Number.parseInt(value, 10);
    return Number.isNaN(index) ? value : (timestamps[index] ?? "");
  };
  const orderedSelectedIndexes =
    selectedIndexes.length === 2
      ? [...selectedIndexes].sort((left, right) => left - right)
      : selectedIndexes;
  const selectedPointSeries = data.map((value, index) =>
    orderedSelectedIndexes.includes(index) ? value : null,
  );
  const selectedSlopeSeries =
    orderedSelectedIndexes.length === 2
      ? data.map((value, index) =>
          orderedSelectedIndexes.includes(index) ? value : null,
        )
      : [];
  const slopeMeasurement =
    orderedSelectedIndexes.length === 2
      ? calculateSlopeMeasurement(
          orderedSelectedIndexes[0],
          orderedSelectedIndexes[1],
          data,
          rawTimestamps,
          unit,
        )
      : null;

  useEffect(() => {
    setSelectedIndexes([]);
  }, [
    data.length,
    labels.length,
    rawTimestamps[rawTimestamps.length - 1],
    unit,
  ]);

  const handleAxisClick = (
    _event: MouseEvent,
    axisData: { dataIndex: number } | null,
  ) => {
    if (!axisData || !Number.isInteger(axisData.dataIndex)) {
      return;
    }

    const clickedIndex = axisData.dataIndex;

    if (clickedIndex < 0 || clickedIndex >= data.length) {
      return;
    }

    setSelectedIndexes((previous) => {
      if (previous.length === 2) {
        return [];
      }

      if (previous[0] === clickedIndex) {
        return [];
      }

      return [...previous, clickedIndex];
    });
  };

  return (
    <div className="relative flex h-full min-h-0 flex-1">
      <div className="pointer-events-none absolute right-10 top-1 z-10 flex justify-between items-center gap-2">
        {slopeMeasurement && (
          <div className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-xs font-medium text-white/88">
            {`${slopeMeasurement.label}`}
          </div>
        )}
        <div className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-xs font-medium text-white/88">
          {currentValue}
        </div>
        {secondarySeries && (
          <div className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-xs font-medium text-white/88">
            {secondarySeries.currentValue}
          </div>
        )}
      </div>
      <LineChart
        margin={{
          top: 8,
          right: secondarySeries ? 20 : 8,
          bottom: 10,
          left: 10,
        }}
        height={220}
        grid={{ horizontal: true }}
        xAxis={[
          {
            scaleType: "point",
            data: labels,
            height: 28,
            valueFormatter: (value) => formatTimestampLabel(value),
            tickInterval: sparseTickValues,
            disableLine: true,
            disableTicks: true,
          },
        ]}
        yAxis={[
          {
            id: "primary",
            min: 0,
            max: yMax,
            width: 36,
            disableTicks: true,
            valueFormatter: (value: number) => (value === 0 ? "" : `${value}`),
          },
          ...(secondarySeries
            ? [
                {
                  id: "secondary",
                  min: 0,
                  max: secondarySeries.yMax,
                  position: "right" as const,
                  width: 36,
                  disableTicks: true,
                  valueFormatter: (value: number) =>
                    value === 0 ? "" : `${value}`,
                },
              ]
            : []),
        ]}
        series={[
          {
            id: "primary-series",
            data,
            color: accentColor,
            showMark: false,
            area: true,
            yAxisId: "primary",
            valueFormatter: (value) =>
              value === null ? null : `${value} ${unit}`,
          },
          {
            id: "primary-latest",
            data: latestPointOnly,
            color: accentColor,
            showMark: true,
            curve: "linear",
            yAxisId: "primary",
            valueFormatter: () => null,
          },
          ...(orderedSelectedIndexes.length === 2
            ? [
                {
                  id: "primary-slope-line",
                  data: selectedSlopeSeries,
                  color: accentColor,
                  showMark: false,
                  curve: "linear" as const,
                  connectNulls: true,
                  yAxisId: "primary",
                  valueFormatter: () => null,
                },
              ]
            : []),
          ...(selectedIndexes.length > 0
            ? [
                {
                  id: "primary-selection-points",
                  data: selectedPointSeries,
                  color: accentColor,
                  showMark: true,
                  curve: "linear" as const,
                  yAxisId: "primary",
                  valueFormatter: () => null,
                },
              ]
            : []),
          ...(secondarySeries
            ? [
                {
                  id: "secondary-series",
                  data: secondarySeries.data,
                  color: secondarySeries.accentColor,
                  showMark: false,
                  curve: "linear" as const,
                  yAxisId: "secondary",
                  valueFormatter: (value: number | null) =>
                    value === null ? null : `${value} ${secondarySeries.unit}`,
                },
                {
                  id: "secondary-latest",
                  data: secondaryLatestPointOnly ?? [],
                  color: secondarySeries.accentColor,
                  showMark: true,
                  curve: "linear" as const,
                  yAxisId: "secondary",
                  valueFormatter: () => null,
                },
              ]
            : []),
        ]}
        sx={{
          ...chartSx,
          "& .MuiLineElement-series-secondary-series": {
            strokeDasharray: "6 4",
          },
          "& .MuiLineElement-series-primary-slope-line": {
            strokeDasharray: "5 4",
            strokeWidth: 2.5,
            opacity: 0.95,
          },
          "& .MuiMarkElement-root": {
            strokeWidth: 2,
            r: 4,
          },
          "& .MuiMarkElement-series-primary-latest": {
            fill: accentColor,
            stroke: accentColor,
          },
          "& .MuiMarkElement-series-primary-selection-points": {
            fill: "#ffffff",
            stroke: accentColor,
            strokeWidth: 2.5,
            r: 5,
          },
          ...(secondarySeries
            ? {
                "& .MuiMarkElement-series-secondary-latest": {
                  fill: secondarySeries.accentColor,
                  stroke: secondarySeries.accentColor,
                },
              }
            : {}),
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
        onAxisClick={handleAxisClick}
        skipAnimation
      />
    </div>
  );
}

function getSparseTickValues(labels: string[], maxTicks = 6) {
  if (labels.length <= maxTicks) {
    return labels;
  }

  const step = Math.ceil((labels.length - 1) / (maxTicks - 1));
  const selectedIndexes = new Set<number>([0, labels.length - 1]);

  for (let index = step; index < labels.length - 1; index += step) {
    selectedIndexes.add(index);
  }

  return labels.filter((_, index) => selectedIndexes.has(index));
}

function calculateSlopeMeasurement(
  startIndex: number,
  endIndex: number,
  data: number[],
  rawTimestamps: number[],
  unit: string,
) {
  const startValue = data[startIndex];
  const endValue = data[endIndex];
  const startTimestamp = rawTimestamps[startIndex];
  const endTimestamp = rawTimestamps[endIndex];
  const elapsedSeconds =
    (endTimestamp - startTimestamp) / TIMESTAMP_UNITS_PER_SECOND;

  if (
    !Number.isFinite(startValue) ||
    !Number.isFinite(endValue) ||
    !Number.isFinite(startTimestamp) ||
    !Number.isFinite(endTimestamp) ||
    elapsedSeconds <= 0
  ) {
    return null;
  }

  const slope = (endValue - startValue) / elapsedSeconds;

  if (!Number.isFinite(slope)) {
    return null;
  }

  return {
    value: slope,
    label: `${slope >= 0 ? "+" : ""}${roundTo(slope, 2)} ${unit}/s`,
  };
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
        height: "100%",
        aspectRatio: 1 / 1,
        marginTop: "min(0.6vh,0.3vw)",
        display: "flex",
        alignItems: "start",
        justifyContent: "center",
      }}
    >
      <LinearProgress
        variant="determinate"
        value={Math.min(value, 100)}
        sx={{
          height: 30,
          width: "100%", // becomes height after rotation
          transform: "translateX(-100%) rotate(-90deg)",
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
  startTime?: number,
  currentTime: number = lapTimestamps[lapTimestamps.length - 1] ??
    startTime ??
    0,
): { value: number; color: string }[] {
  if (lapTimestamps.length === 0) return [];
  let lapTimes = [
    { value: lapTimestamps[0] - (startTime ?? 0), color: "text-white/55" },
  ];
  for (let i = 1; i < lapTimestamps.length; i++) {
    const value = lapTimestamps[i] - lapTimestamps[i - 1];
    const color =
      value < 525 * TIMESTAMP_UNITS_PER_SECOND
        ? "text-green-700"
        : "text-red-700";
    lapTimes = [{ value: value, color: color }, ...lapTimes];
  }
  lapTimes = [
    {
      value: currentTime - lapTimestamps[lapTimestamps.length - 1],
      color: "text-white/55",
    },
    ...lapTimes,
  ];
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
  const normalized = Math.min(Math.max(Math.abs(value), 0), 100);
  return formatValue(normalized, 0);
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
