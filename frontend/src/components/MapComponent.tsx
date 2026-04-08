import { useEffect, useState, useRef } from "react";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import mapImage from "../assets/map.jpg";
import locations from "../utils/locations";

const locationOptions = ["B-Lot", "Indianapolis Motor Speedway"] as const;
type TrackLocation = (typeof locationOptions)[number];

const IMS_TURN_MARKERS = [
  { id: 1, lat: 39.799075111676224, lng: -86.23865549660229 },
  { id: 2, lat: 39.799295129847344, lng: -86.2377705786008 },
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

const IMS_FLAG_MARKERS = [
  {
    id: "green-flag",
    lat: 39.793509866527366,
    lng: -86.2388742590957,
    label: "Green",
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

const MapComponent = ({
  latitude,
  longitude,
  className = "",
}: {
  latitude: number | null;
  longitude: number | null;
  interactive?: boolean;
  className?: string;
}) => {
  const [selectedLocation, setSelectedLocation] = useState<TrackLocation>(
    "Indianapolis Motor Speedway",
  );
  const position = {
    lat: latitude ?? locations[selectedLocation].lat,
    lng: longitude ?? locations[selectedLocation].lng,
  };
  const mapCenter = locations[selectedLocation];
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const mapId = import.meta.env.VITE_GOOGLE_MAP_ID || "DEMO_MAP_ID";

  const [heading, setHeading] = useState(90);
  const [isDragging, setIsDragging] = useState(false);
  const lastX = useRef<number | null>(null);
  const [isPulsing, setIsPulsing] = useState(false);

  const [zoom, setZoom] = useState(15);
  const minZoom = 14;
  const maxZoom = 20;
  const showImsMarkers = selectedLocation === "Indianapolis Motor Speedway";

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    setZoom((prev) => {
      let delta = e.deltaY < 0 ? 0.1 : -0.1;
      let newZoom = prev + delta;
      if (newZoom < minZoom) newZoom = minZoom;
      if (newZoom > maxZoom) newZoom = maxZoom;
      return newZoom;
    });
  };

  useEffect(() => {
    const container = document.getElementById("map-container");
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((prev) => {
        let delta = e.deltaY < 0 ? 0.1 : -0.1;
        let newZoom = prev + delta;
        if (newZoom < minZoom) newZoom = minZoom;
        if (newZoom > maxZoom) newZoom = maxZoom;
        return newZoom;
      });
    };

    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, []);

  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      setIsPulsing(true);

      const timeout = setTimeout(() => {
        setIsPulsing(false);
      }, 800); // duration of pulse

      return () => clearTimeout(timeout);
    }
  }, [latitude, longitude]);

  if (!apiKey) {
    return (
      <div
        className={`relative h-full w-full overflow-hidden rounded-[1.1rem] ${className}`}
      >
        <img
          src={mapImage}
          alt="Track map fallback"
          className="h-full w-full object-cover opacity-80"
        />
        <div className="absolute bottom-4 left-4 rounded-full bg-black/60 px-3 py-1 text-sm text-white">
          {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <div
        id="map-container"
        className={`relative h-full w-full overflow-hidden rounded-[1.1rem] cursor-grab hover:cursor-grabbing ${className}`}
        onMouseDown={(e) => {
          e.preventDefault();
          setIsDragging(true);
          lastX.current = e.clientX;
          if (e.button === 2) {
            e.preventDefault();
            setSelectedLocation((prev) =>
              prev === "B-Lot" ? "Indianapolis Motor Speedway" : "B-Lot",
            );
          }
        }}
        onMouseUp={() => {
          setIsDragging(false);
          lastX.current = null;
        }}
        onMouseLeave={() => setIsDragging(false)}
        onMouseMove={(e) => {
          if (!isDragging || lastX.current === null) return;

          const deltaX = e.clientX - lastX.current;
          lastX.current = e.clientX;

          setHeading((h) => (h + deltaX * 0.5) % 360); // sensitivity tweak
        }}
        onWheel={handleWheel}
      >
        <Map
          center={mapCenter}
          defaultZoom={12}
          zoom={zoom}
          gestureHandling="none"
          disableDefaultUI
          keyboardShortcuts={false}
          streetViewControl={false}
          mapTypeControl={false}
          fullscreenControl={false}
          defaultHeading={135}
          heading={heading}
          tilt={35}
          mapId={mapId}
          options={{
            clickableIcons: false,
          }}
        >
          {showImsMarkers
            ? IMS_TURN_MARKERS.map((marker) => (
                <AdvancedMarker
                  key={`turn-${marker.id}`}
                  position={{ lat: marker.lat, lng: marker.lng }}
                  anchorLeft="-50%"
                  anchorTop="-50%"
                >
                  <TurnMarkerLabel turn={marker.id} zoom={zoom} />
                </AdvancedMarker>
              ))
            : null}
          {showImsMarkers
            ? IMS_FLAG_MARKERS.map((marker) => (
                <AdvancedMarker
                  key={marker.id}
                  position={{ lat: marker.lat, lng: marker.lng }}
                  anchorLeft="-50%"
                  anchorTop="-85%"
                >
                  <FlagMarker
                    label={marker.label}
                    variant={marker.variant}
                    zoom={zoom}
                  />
                </AdvancedMarker>
              ))
            : null}
          <AdvancedMarker
            position={position}
            anchorLeft="-50%"
            anchorTop="-50%"
          >
            <div className="relative">
              {/* glow */}
              <div
                className={`
                  absolute h-6 w-6 rounded-full
                  bg-blue-400 blur-md transition-all duration-300
                  ${isPulsing ? "opacity-90 scale-125" : "opacity-40 scale-100"}
                `}
              />
              {/* core dot */}
              <div
                className={`
                  ${zoom >= 16 ? "h-3 w-3" : "h-2 w-2"} rounded-full
                  bg-blue-500 border-2 border-white
                  transition-transform duration-300
                  ${isPulsing ? "scale-125" : "scale-100"}
                `}
              />
              {/* ripple effect */}
              {isPulsing && (
                <div className="absolute h-8 w-8 top-1/2 left-1/2 translate-x-[-50%] translate-y-[-50%] rounded-full bg-blue-400 opacity-50 animate-ping" />
              )}
            </div>
          </AdvancedMarker>
        </Map>
      </div>
    </APIProvider>
  );
};

function TurnMarkerLabel({ turn, zoom }: { turn: number; zoom: number }) {
  const isClose = zoom >= 14;

  return (
    <div
      className={`flex items-center justify-center rounded-full border border-white/80 bg-slate-950/88 font-semibold text-white shadow-[0_4px_14px_rgba(0,0,0,0.32)] backdrop-blur-sm ${
        isClose
          ? "h-3.5 min-w-3.5 px-px text-[7px]"
          : "h-3.5 min-w-3.5 px-px text-[7px]"
      }`}
      aria-label={`Turn ${turn}`}
      title={`Turn ${turn}`}
    >
      {turn}
    </div>
  );
}

function FlagMarker({
  label,
  variant,
  zoom,
}: {
  label: string;
  variant: "green" | "checkered";
  zoom: number;
}) {
  const isClose = zoom >= 14;
  const badgeClass = isClose ? "h-2.5 w-2.5" : "h-2.5 w-2.5";

  return (
    <div
      className="flex flex-col items-center"
      aria-label={label}
      title={label}
    >
      <div className="relative">
        <div
          className={`relative ml-1 rounded-[3px] border border-white/75 shadow-[0_4px_12px_rgba(0,0,0,0.28)] ${badgeClass} ${
            variant === "green"
              ? "bg-emerald-500"
              : "bg-[conic-gradient(from_90deg,#ffffff_0_25%,#111827_25%_50%,#ffffff_50%_75%,#111827_75%_100%)]"
          }`}
        />
      </div>
    </div>
  );
}

export default MapComponent;
