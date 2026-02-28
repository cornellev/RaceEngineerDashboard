import { useState, useEffect } from "react";
import { LineChart } from "@mui/x-charts/LineChart";
import socket from "../utils/Socket";

export default function Chart() {
  const [time, setTime] = useState<number[]>(
    Array.from({ length: 1000 }, (_, i) => i),
  );
  const [voltage, setVoltage] = useState<number[]>(
    Array.from(
      { length: 1000 },
      () => Math.floor(Math.random() * (300 - 100 + 1)) + 100,
    ),
  );

  useEffect(() => {
    const unsubscribe = socket.subscribe((data) => {
      console.log("Received data from backend:", JSON.stringify(data));
      setTime((prev) => [...prev.slice(-2000), data.seq]);
      setVoltage((prev) => [...prev.slice(-2000), data.voltage]);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="w-full h-full bg-gray-800 rounded-lg p-4">
      <h2 className="text-white text-xl mb-4">Chart Placeholder</h2>
      <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
        <LineChart
          xAxis={[{ data: time }]}
          yAxis={[{ scaleType: "linear" }]}
          series={[
            {
              type: "line",
              showMark: false,
              data: voltage,
            },
          ]}
          height={300}
          width={1000}
        />
      </div>
    </div>
  );
}
