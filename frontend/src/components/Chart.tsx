import { useState, useEffect } from "react";
import { LineChart } from "@mui/x-charts/LineChart";
import socket from "../utils/Socket";

export default function Chart() {
  const [time, setTime] = useState<number[]>([]);
  const [voltage, setVoltage] = useState<number[]>([]);

  useEffect(() => {
    const unsubscribe = socket.subscribe((data) => {
      console.log("Received data from backend:", JSON.stringify(data));
      setTime((prev) => [...prev, data.seq]);
      setVoltage((prev) => [...prev, data.voltage]);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="w-full h-full bg-gray-800 rounded-lg p-4">
      <h2 className="text-white text-xl mb-4">Chart Placeholder</h2>
      <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
        <LineChart
          xAxis={[{ data: time }]}
          series={[
            {
              data: voltage,
            },
          ]}
          height={300}
        />
      </div>
    </div>
  );
}
