import InteractiveGrid from "../layouts/InteractiveGrid";
import type { SocketData } from "../utils/Socket";

export default function Data({ data }: { data: SocketData[] }) {
  return (
    <section className="h-[calc(100vh-10vh)] w-full overflow-hidden bg-[#0b1015] px-3 py-3 sm:px-4 lg:px-5">
      <InteractiveGrid data={data} />
    </section>
  );
}
