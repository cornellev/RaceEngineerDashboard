import { useEffect, useState } from "react";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import mapImage from "../assets/map.jpg";

const MapComponent = ({
  latitude,
  longitude,
  interactive = true,
  className = "",
}: {
  latitude: number | null;
  longitude: number | null;
  interactive?: boolean;
  className?: string;
}) => {
  const position = {
    lat: latitude || 42.44666485723302,
    lng: longitude || -76.4608710371343,
  };
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const mapId = import.meta.env.VITE_GOOGLE_MAP_ID || "DEMO_MAP_ID";

  const [isPulsing, setIsPulsing] = useState(false);
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
        <div className="absolute bottom-4 left-4 rounded-full bg-black/60 px-3 py-1 text-sm text-white">
          {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <div
        className={`h-full w-full overflow-hidden rounded-[1.1rem] ${className}`}
      >
        <Map
          center={{ lat: 42.44638739192644, lng: -76.463079723162 }}
          defaultZoom={16}
          gestureHandling={interactive ? "greedy" : "none"}
          disableDefaultUI={!interactive}
          keyboardShortcuts={false}
          zoomControl={interactive}
          streetViewControl={false}
          mapTypeControl={false}
          fullscreenControl={false}
          defaultHeading={90}
          heading={90}
          tilt={45}
          mapId={mapId}
        >
          <AdvancedMarker position={position}>
            <div className="relative">
              {/* glow */}
              <div
                className={`
                  absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full
                  bg-blue-400 blur-md transition-all duration-300
                  ${isPulsing ? "opacity-90 scale-125" : "opacity-40 scale-100"}
                `}
              />
              {/* core dot */}
              <div
                className={`
                  h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full
                  bg-blue-500 border-2 border-white
                  transition-transform duration-300
                  ${isPulsing ? "scale-125" : "scale-100"}
                `}
              />
              {/* ripple effect */}
              {isPulsing && (
                <div className="absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-400 opacity-50 animate-ping" />
              )}
            </div>
          </AdvancedMarker>
        </Map>
      </div>
    </APIProvider>
  );
};

export default MapComponent;
