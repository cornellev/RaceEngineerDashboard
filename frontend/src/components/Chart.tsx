import { LineChart } from "@mui/x-charts/LineChart";

export default function Chart() {
  return (
    <div className="w-full h-full bg-gray-800 rounded-lg p-4">
      <h2 className="text-white text-xl mb-4">Chart Placeholder</h2>
      <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
        <LineChart
          xAxis={[{ data: [1, 2, 3, 5, 8, 10] }]}
          series={[
            {
              data: [2, 5.5, 2, 8.5, 1.5, 5],
            },
          ]}
          height={300}
        />
      </div>
    </div>
  );
}
