import type { SocketData } from "./Socket";

export const TIMESTAMP_UNITS_PER_SECOND = 1e6;
const HOURS_PER_SECOND = 1 / 3600;
const METERS_PER_MILE = 1609.344;
const WGS84_SEMI_MAJOR_AXIS = 6378137;
const WGS84_FLATTENING = 1 / 298.257223563;
const WGS84_ECCENTRICITY_SQUARED = WGS84_FLATTENING * (2 - WGS84_FLATTENING);

export function calculatePowerKilowatts(sample: SocketData): number {
  return Math.max(0, (sample.power.current * sample.power.voltage) / 1000);
}

export function calculateEfficiency(sample: SocketData): number | null {
  const powerKw = calculatePowerKilowatts(sample);

  if (powerKw <= 0) {
    return null;
  }

  return (sample.filtered.speed * 2.23694) / powerKw;
}

export function calculateLapTimes(
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

  for (let index = 1; index < lapTimestamps.length; index += 1) {
    const value = lapTimestamps[index] - lapTimestamps[index - 1];
    const color =
      value < 525 * TIMESTAMP_UNITS_PER_SECOND ? "text-green-700" : "text-red-700";
    lapTimes = [{ value, color }, ...lapTimes];
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

export function calculateEnergyKilowattHoursBetween(
  previousPowerKilowatts: number,
  currentPowerKilowatts: number,
  previousTimestamp: number,
  currentTimestamp: number,
): number {
  const elapsedHours =
    (Math.max(0, currentTimestamp - previousTimestamp) /
      TIMESTAMP_UNITS_PER_SECOND) *
    HOURS_PER_SECOND;

  if (elapsedHours <= 0) {
    return 0;
  }

  return ((previousPowerKilowatts + currentPowerKilowatts) / 2) * elapsedHours;
}

export function calculateLocalTangentDistanceMeters(
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

export function isValidGpsCoordinate(
  latitude: number,
  longitude: number,
): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude !== 0 &&
    longitude !== 0
  );
}

export function metersToMiles(value: number): number {
  return value / METERS_PER_MILE;
}

export function formatElapsed(startTs: number, currentTs: number): string {
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

export function formatRunTimer(startTs: number, currentTs: number): string {
  const elapsedSeconds = Math.max(
    0,
    (currentTs - startTs) / TIMESTAMP_UNITS_PER_SECOND,
  );
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds - minutes * 60;

  return `${minutes}:${seconds.toFixed(1).padStart(4, "0")}`;
}

export function formatDistanceMiles(value: number): string {
  return Number.isFinite(value) ? `${value.toFixed(3)} mi` : "--";
}

export function formatEnergyWattHours(value: number): string {
  return Number.isFinite(value) ? `${value.toFixed(3)} Wh` : "--";
}

export function formatValue(value: number, decimals: number): string {
  return Number.isFinite(value) ? value.toFixed(decimals) : "--";
}

export function formatEfficiency(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "0.00 mi/kWh";
  }

  return `${value.toFixed(2)} mi/kWh`;
}

export function formatThrottle(value: number): string {
  const normalized = Math.min(Math.max(Math.abs(value), 0), 100);
  return formatValue(normalized, 0);
}

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
