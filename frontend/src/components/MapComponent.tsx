import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";

const MapComponent = ({
  latitude,
  longitude,
}: {
  latitude: number | null;
  longitude: number | null;
}) => {
  const position = {
    lat: latitude || 42.44666485723302,
    lng: longitude || -76.4608710371343,
  };

  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "0"}>
      <div style={{ height: "400px", width: "100%" }}>
        <Map
          defaultCenter={position}
          defaultZoom={13}
          gestureHandling={"greedy"}
          disableDefaultUI={false}
          mapId={import.meta.env.VITE_GOOGLE_MAP_ID || "DEMO_MAP_ID"}
        >
          <AdvancedMarker position={position} />
        </Map>
      </div>
    </APIProvider>
  );
};

export default MapComponent;
