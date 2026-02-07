import CarScene from "../components/CarScene";
import Overlay from "../components/Overlay";

export default function Hero() {
  return (
    <section className="w-screen h-screen flex items-center justify-center bg-linear-to-b from-[#1e1e1e] to-[#121212]">
      <CarScene />
      <Overlay />
    </section>
  );
}
