interface Location {
  lat: number;
  lng: number;
}

/**
 * Location Options
 * @key "B-Lot"
 * @key "Indianapolis Motor Speedway"
 */
export const locations: Record<string, Location> = {
  "B-Lot": { lat: 42.44656683714592, lng: -76.4630167437453 },
  "Indianapolis Motor Speedway": {
    lat: 39.79511968382295,
    lng: -86.23477335003211,
  },
};

export const IMS_TURN_MARKERS = [
  { id: 1, lat: 39.799790, lng: -86.238500 },
  { id: 2, lat: 39.799889, lng: -86.237867 },
  { id: 3, lat: 39.80037913540656, lng: -86.23760192842447 },
  { id: 4, lat: 39.801163421941126, lng: -86.23585301585724 },
  { id: 5, lat: 39.799488293418236, lng: -86.23539460045293 },
  { id: 6, lat: 39.79902455557395, lng: -86.23514440526584 },
  { id: 7, lat: 39.79236342353246, lng: -86.23463847050992 },
  { id: 8, lat: 39.792192922155095, lng: -86.23324845441954 },
  { id: 9, lat: 39.791596164009725, lng: -86.2326769568461 },
  { id: 10, lat: 39.791533431721575, lng: -86.23125135300353 },
  { id: 11, lat: 39.788861077810736, lng: -86.23156241589633 },
  { id: 12, lat: 39.78827959633701, lng: -86.23528251099486 },
  { id: 13, lat: 39.789553967953125, lng: -86.23556880408972 },
  { id: 14, lat: 39.789262796749206, lng: -86.2375730529455 },
] as const;

export const IMS_FLAG_MARKERS = [
  {
    id: "green-flag1",
    lat: 39.793509866527366,
    lng: -86.2388742590957,
    label: "Start",
    variant: "green" as const,
  },
  {
    id: "green-flag2",
    lat: 39.793599,
    lng: -86.234911,
    label: "Halfway",
    variant: "green" as const,
  },
  { 
    id: "checkered-flag",
    lat: 39.793164176215356,
    lng: -86.23886986975018,
    label: "Finish",
    variant: "checkered" as const,
  },
] as const;
