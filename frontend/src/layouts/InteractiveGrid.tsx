import { useState } from "react";
import type { MouseEventHandler } from "react";

import GridCard from "../components/GridCard";
import { LineChart } from "@mui/x-charts";
import {
  Gauge,
  GaugeContainer,
  gaugeClasses,
  GaugeReferenceArc,
  useGaugeState,
} from "@mui/x-charts/Gauge";

export default function InteractiveGrid() {
  const [voltageData, setVoltageData] = useState([
    200, 180, 400, 500, 600, 450,
  ]);
  const [currentData, setCurrentData] = useState([100, 60, 200, 50, 18, 30]);
  const [timeData, setTimeData] = useState([1, 2, 3, 4, 5, 6, 7]);

  const [intervalId, setIntervalId] = useState<number>(0);
  const [speed, setSpeed] = useState(30);

  const handleClick: MouseEventHandler = () => {
    setVoltageData((prev) => [...prev, Math.floor(Math.random() * 500 + 500)]);
    setCurrentData((prev) => [...prev, Math.floor(Math.random() * 500)]);
    setTimeData((prev) => [...prev, prev.length + 1]);
    console.log(voltageData, currentData);
  };

  const handleSpeedClick: MouseEventHandler = () => {
    if (intervalId != 0) {
      window.clearInterval(intervalId);
      setIntervalId(0);
      return;
    }
    const newIntervalId = window.setInterval(() => {
      setSpeed((prev) =>
        Math.min(Math.max(prev + (Math.random() - 0.5), 0), 85),
      );
    }, 10);
    setIntervalId(newIntervalId);
  };

  return (
    <div className="w-full h-full grid grid-cols-6 grid-rows-2 gap-2 p-2">
      <GridCard width="4 / span 3" height="2 / span 3" onClick={handleClick}>
        <LineChart
          series={[
            {
              data: currentData,
              label: "Current (A)",
              yAxisId: "leftAxisId",
              showMark: false,
            },
            {
              data: voltageData,
              label: "Voltage (V)",
              yAxisId: "rightAxisId",
              showMark: false,
            },
          ]}
          xAxis={[{ scaleType: "point", data: timeData, height: 28 }]}
          yAxis={[
            { id: "leftAxisId", width: 50 },
            { id: "rightAxisId", position: "right" },
          ]}
          skipAnimation={true}
          sx={{
            // Axis lines
            ".MuiChartsAxis-root .MuiChartsAxis-line": {
              stroke: "#cccccc", // axis line color
            },
            // Tick labels (numbers)
            ".MuiChartsAxis-tickLabel": {
              fill: "#cccccc", // text color
              fontSize: 12,
            },
            "& .MuiChartsAxis-bottom .MuiChartsAxis-tickLabel": {
              fill: "white",
            },
            // Y-axis ticks (left position)
            "& .MuiChartsAxis-left .MuiChartsAxis-tickLabel": {
              fill: "white",
            },
            "& .MuiChartsAxis-right .MuiChartsAxis-tickLabel": {
              fill: "white",
            },
          }}
          slotProps={{
            legend: {
              sx: {
                // Legend text color
                ".MuiChartsLegend-label": {
                  fill: "#cccccc", // or 'color: "#888888"' for consistency
                },
                // Optional: full legend root font styling
                color: "#cccccc",
                fontSize: 14,
              },
            },
          }}
          height={200}
        />
      </GridCard>
      <GridCard width="1 / span 3" height="2/ span 2">
        <LineChart
          series={[
            {
              data: [
                30, 200, 100, 40, 250, 350, 45, 500, 600, 550, 700, 650, 750,
                80, 85, 90, 95, 10, 105, 610, 115, 120, 625, 230, 335, 140, 145,
                150, 255, 360,
              ],
              label: "Power (kW)",
              yAxisId: "leftAxisId",
              showMark: false,
            },
          ]}
          xAxis={[
            {
              scaleType: "time",
              data: [
                1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
                19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
              ],
              height: 28,
            },
          ]}
          yAxis={[
            { id: "leftAxisId", width: 50 },
            { id: "rightAxisId", position: "right" },
          ]}
          grid={{ vertical: true, horizontal: true }}
          sx={{
            // Axis lines
            ".MuiChartsAxis-root .MuiChartsAxis-line": {
              stroke: "#cccccc", // axis line color
            },
            // Tick labels (numbers)
            ".MuiChartsAxis-tickLabel": {
              fill: "#cccccc", // text color
              fontSize: 12,
            },
            "& .MuiChartsAxis-bottom .MuiChartsAxis-tickLabel": {
              fill: "white",
            },
            // Y-axis ticks (left position)
            "& .MuiChartsAxis-left .MuiChartsAxis-tickLabel": {
              fill: "white",
            },
            "& .MuiChartsAxis-right .MuiChartsAxis-tickLabel": {
              fill: "white",
            },
          }}
          slotProps={{
            legend: {
              sx: {
                // Legend text color
                ".MuiChartsLegend-label": {
                  fill: "#cccccc", // or 'color: "#888888"' for consistency
                },
                // Optional: full legend root font styling
                color: "#cccccc",
                fontSize: 14,
              },
            },
          }}
          height={200}
        />
      </GridCard>
      <GridCard
        width="1 / span 2"
        height="1 / span 1"
        onClick={handleSpeedClick}
      >
        <div className="w-full h-full flex items-center justify-center text-sm text-gray-400 flex-col gap-1">
          <h1>Speed</h1>
          <GaugeContainer
            width={150}
            height={150}
            startAngle={-110}
            endAngle={110}
            value={speed}
            sx={() => ({
              [`& .${gaugeClasses.referenceArc}`]: {
                fill: "#cccccc",
              },
            })}
          >
            <GaugeReferenceArc />
            <GaugePointer />
          </GaugeContainer>
          <strong style={{ fontSize: "2em" }}>{Math.floor(speed)}mph</strong>
        </div>
      </GridCard>
      <GridCard width="3 / span 2" height="1 / span 1">
        <div className="w-full h-full flex items-center justify-center text-sm text-gray-400 flex-col gap-1">
          <h1>RPM</h1>
          <div className="flex items-center justify-between flex-row">
            <Gauge
              value={75}
              startAngle={-110}
              endAngle={110}
              sx={{
                // layout / font styling of the value group
                [`& .${gaugeClasses.valueText}`]: {
                  fontSize: 40,
                },
                // actual SVG text color
                [`& .${gaugeClasses.valueText} text`]: {
                  fill: "#3b82f6",
                },
              }}
            />
            <Gauge
              value={60}
              startAngle={-110}
              endAngle={110}
              sx={{
                // layout / font styling of the value group
                [`& .${gaugeClasses.valueText}`]: {
                  fontSize: 40,
                },
                // actual SVG text color
                [`& .${gaugeClasses.valueText} text`]: {
                  fill: "#3b82f6",
                },
              }}
            />
          </div>
          <div className="w-6/10 flex items-center justify-between flex-row text-2xl">
            <strong>Front</strong>
            <strong>Rear</strong>
          </div>
        </div>
      </GridCard>
      <GridCard width="5 / span 2" height="1 / span 1">
        <div className="w-full h-full flex items-center justify-center text-sm text-gray-400 flex-col gap-1">
          <h1>Battery</h1>
          <Gauge
            width={150}
            height={150}
            value={60}
            cornerRadius="50%"
            sx={(theme) => ({
              [`& .${gaugeClasses.valueText}`]: {
                fontSize: 40,
              },
              [`& .${gaugeClasses.valueText} text`]: {
                fontSize: 40,
                fill: "#cccccc",
              },
              [`& .${gaugeClasses.valueArc}`]: {
                fill: "#52b202",
              },
              [`& .${gaugeClasses.referenceArc}`]: {
                fill: theme.palette.text.disabled,
              },
            })}
          />
          <strong style={{ fontSize: "2em" }}>60mi/kwh</strong>
        </div>
      </GridCard>
    </div>
  );
}

function GaugePointer() {
  const { valueAngle, outerRadius, cx, cy } = useGaugeState();

  if (valueAngle === null) {
    // No value to display
    return null;
  }

  const target = {
    x: cx + outerRadius * Math.sin(valueAngle),
    y: cy - outerRadius * Math.cos(valueAngle),
  };
  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill="red" />
      <path
        d={`M ${cx} ${cy} L ${target.x} ${target.y}`}
        stroke="red"
        strokeWidth={3}
      />
    </g>
  );
}
