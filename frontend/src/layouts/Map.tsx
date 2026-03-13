import { useEffect, useState } from "react";
import MapComponent from "../components/MapComponent";
import socket from "../utils/Socket";
import type { SocketData } from "../utils/Socket";

export default function Map() {
  const [[latitude, longitude], setLatLong] = useState([
    42.44666485723302, -76.4608710371343,
  ]);

  useEffect(() => {
    const updateLatLong = (data: SocketData) => {
      setLatLong([data.gps.lat, data.gps.long]);
    };

    const unsubscribe = socket.subscribe(updateLatLong);

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <>
      <div className="w-1/1 h-screen flex items-center justify-center overflow-hidden">
        <img src="./map.jpg" alt="Map image" />
        <MapComponent latitude={latitude} longitude={longitude} />
      </div>
    </>
  );
}
