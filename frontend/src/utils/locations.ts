interface Location {
  lat: number;
  lng: number;
}

/**
 * Location Options
 * @key "B-Lot"
 * @key "Indianapolis Motor Speedway"
 */
const locations: Record<string, Location> = {
  "B-Lot": { lat: 42.44656683714592, lng: -76.4630167437453 },
  "Indianapolis Motor Speedway": {
    lat: 39.79511968382295,
    lng: -86.23477335003211,
  },
};

export default locations;
