import { useEffect, useState, useRef } from "react";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import mapImage from "../assets/map.jpg";
import locations from "../utils/locations";

const locationOptions = ["B-Lot", "Indianapolis Motor Speedway"] as const;
type TrackLocation = (typeof locationOptions)[number];

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
  const [selectedLocation, setSelectedLocation] =
    useState<TrackLocation>("B-Lot");
  const [isLocationMenuOpen, setIsLocationMenuOpen] = useState(false);
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

  const [active, setActive] = useState<boolean>(false);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
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
      }, 400); // duration of pulse

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
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,12,17,0.08),rgba(8,12,17,0.45))]" />
        <div className="absolute left-4 top-4 z-10 w-[min(19rem,calc(100%-2rem))]">
          <div className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(36,36,36,0.96),rgba(28,28,28,0.94))] p-2 shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-md">
            <div className="px-2 pb-2 text-[11px] uppercase tracking-[0.22em] text-white/45">
              Map Location
            </div>
            <div className="grid gap-2">
              {locationOptions.map((locationName) => {
                const isActive = locationName === selectedLocation;

                return (
                  <button
                    key={locationName}
                    type="button"
                    className={`flex items-center justify-between rounded-[0.85rem] border px-3 py-2 text-left transition ${
                      isActive
                        ? "border-(--primary-accent) bg-[rgba(196,30,58,0.16)] text-white"
                        : "border-white/8 bg-white/4 text-white/72 hover:border-white/14 hover:bg-white/7"
                    }`}
                    onClick={() => setSelectedLocation(locationName)}
                  >
                    <span className="text-sm font-medium">{locationName}</span>
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        isActive ? "bg-(--primary-accent)" : "bg-white/25"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
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
            setActive(true);
            setTimeout(() => {
              setActive(false);
            }, 3000);
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
        {active ? (
          <div className="absolute left-4 top-4 z-10 w-[min(19rem,calc(100%-2rem))]">
            <div className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(36,36,36,0.94),rgba(28,28,28,0.92))] p-2 shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-md">
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-[0.85rem] border border-white/8 bg-white/4 px-3 py-2 text-left transition hover:border-white/14 hover:bg-white/7"
                onClick={() => setIsLocationMenuOpen((open) => !open)}
              >
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                    Map Location
                  </div>
                  <div className="mt-1 text-sm font-semibold text-white">
                    {selectedLocation}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-(--primary-accent) shadow-[0_0_10px_rgba(196,30,58,0.7)]" />
                  <span className="text-lg leading-none text-white/60">
                    {isLocationMenuOpen ? "−" : "+"}
                  </span>
                </div>
              </button>

              {isLocationMenuOpen ? (
                <div className="mt-2 grid gap-2">
                  {locationOptions.map((locationName) => {
                    const isActive = locationName === selectedLocation;

                    return (
                      <button
                        key={locationName}
                        type="button"
                        className={`flex items-center justify-between rounded-[0.85rem] border px-3 py-2 text-left transition ${
                          isActive
                            ? "border-(--primary-accent) bg-[rgba(196,30,58,0.16)] text-white"
                            : "border-white/8 bg-white/4 text-white/72 hover:border-white/14 hover:bg-white/7"
                        }`}
                        onClick={() => {
                          setSelectedLocation(locationName);
                          setIsLocationMenuOpen(false);
                        }}
                      >
                        <span className="text-sm font-medium">
                          {locationName}
                        </span>
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            isActive ? "bg-(--primary-accent)" : "bg-white/25"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
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
          <AdvancedMarker
            position={position}
            anchorLeft="-50%"
            anchorTop="-50%"
          >
            <div className="relative">
              {/* glow */}
              <div
                className={`
                  absolute h-8 w-8 rounded-full
                  bg-blue-400 blur-md transition-all duration-300
                  ${isPulsing ? "opacity-90 scale-125" : "opacity-40 scale-100"}
                `}
              />
              {/* core dot */}
              <div
                className={`
                  h-3 w-3 rounded-full
                  bg-blue-500 border-2 border-white
                  transition-transform duration-300
                  ${isPulsing ? "scale-125" : "scale-100"}
                `}
              />
              {/* ripple effect */}
              {isPulsing && (
                <div className="absolute h-10 w-10 rounded-full bg-blue-400 opacity-50 animate-ping" />
              )}
            </div>
          </AdvancedMarker>
        </Map>
      </div>
    </APIProvider>
  );
};

export default MapComponent;
