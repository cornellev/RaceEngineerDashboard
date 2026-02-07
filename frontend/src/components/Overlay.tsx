import LineAnimation from "./LineAnimation";

export default function Overlay() {
  return (
    <section className="w-full h-full absolute top-0 left-0 z-50">
      <LineAnimation
        x1={50}
        y1={300}
        x2={250}
        y2={300}
        color="#ff0000"
        thickness={3}
        speed={2}
      />
    </section>
  );
}
