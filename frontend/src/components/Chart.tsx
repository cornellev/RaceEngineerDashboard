import { LineChart } from "@mui/x-charts/LineChart";

export default function Chart({
  title,
  data,
}: {
  title: string;
  data: number[];
}) {
  return (
    <div className="w-200 h-full bg-gray-800 rounded-lg p-4">
      <h2 className="text-white text-xl mb-4">{title}</h2>
      <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
        <LineChart
          xAxis={[{ data: Array.from({ length: data.length }, (_, i) => i) }]}
          yAxis={[{ scaleType: "linear" }]}
          series={[
            {
              type: "line",
              showMark: false,
              data: data,
            },
          ]}
          height={300}
        />
      </div>
    </div>
  );
}
