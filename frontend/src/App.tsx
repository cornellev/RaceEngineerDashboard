import Header from "./components/Header";
import Home from "./pages/Home";
import Data from "./pages/Data";
import RaceGPT from "./pages/RaceGPT";
import SideBar from "./components/SideBar";
import Chart from "./components/Chart";
import MapComponent from "./components/MapComponent";

import socket from "./utils/Socket";
import type { SocketData } from "./utils/Socket";

import { useState, useEffect } from "react";

function App() {
  const [page, setPage] = useState("dummy");
  const [sideBar, setSideBar] = useState(false);
  const [messages, setMessages] = useState("");

  const [data, setData] = useState<SocketData[]>([]);

  const getPageComponent = () => {
    switch (page) {
      case "home":
        return <Home />;
      case "data":
        return <Data />;
      case "racegpt":
        return <RaceGPT />;
      default:
        return (
          <>
            <p className="text-white">JSON: {messages}</p>
            <MapComponent
              latitude={data.length > 0 ? data[data.length - 1].gps.lat : null}
              longitude={
                data.length > 0 ? data[data.length - 1].gps.long : null
              }
            />
            <Chart
              title="Voltage Data"
              data={data.map((d) => d.power.voltage)}
            />
            <Chart
              title="Current Data"
              data={data.map((d) => d.power.current)}
            />
            <Chart
              title="Brake Pressure Data"
              data={data.map((d) => d.steering.brake_pressure)}
            />
            <Chart
              title="Turn Angle Data"
              data={data.map((d) => d.steering.turn_angle)}
            />
            <Chart
              title="RPM Front Left Data"
              data={data.map((d) => d.rpm_front.rpm_left)}
            />
            <Chart
              title="RPM Front Right Data"
              data={data.map((d) => d.rpm_front.rpm_right)}
            />
            <Chart
              title="RPM Back Left Data"
              data={data.map((d) => d.rpm_back.rpm_left)}
            />
            <Chart
              title="RPM Back Right Data"
              data={data.map((d) => d.rpm_back.rpm_right)}
            />
            <Chart title="Motor RPM Data" data={data.map((d) => d.motor.rpm)} />
            <Chart
              title="Motor Throttle Data"
              data={data.map((d) => d.motor.throttle)}
            />
          </>
        );
    }
  };
  useEffect(() => {
    socket.connect();

    const unsubscribe = socket.subscribe((data) => {
      console.log("Received data from backend:", JSON.stringify(data));
      setData(socket.getData());
      setMessages(JSON.stringify(data));
    });

    return () => unsubscribe();
  }, []);

  return (
    <>
      <Header setPage={setPage} setSideBar={setSideBar} sideBar={sideBar} />
      <div className="w-screen h-[10vh] mx-auto px-4 sm:px-6 lg:px-8" />
      <SideBar open={sideBar} />
      <main
        className={`${sideBar ? "w-[80%]" : "w-screen"} h-full transition-all duration-300 ease-in-out m-0 p-0`}
      >
        {getPageComponent()}
      </main>
    </>
  );
}

export default App;
