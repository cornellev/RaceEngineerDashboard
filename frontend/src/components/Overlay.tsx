import Arrow from "./Arrow";
import GridCard from "./GridCard";

export default function Overlay() {
  return (
    <section className="w-full h-full absolute top-0 left-0 z-80">
      <Arrow x={33} y={63} angle={45} />
      <Arrow x={33} y={42} angle={135} />
      <Arrow x={66} y={53} angle={-75} />
      <div className="w-full h-full absolute top-0 left-0 grid grid-cols-7 grid-rows-4 gap-2 p-2">
        <GridCard width={"1 / span 2"} height={"3 / span 2"}>
          <h3>Power</h3>
        </GridCard>
        <GridCard width={"1 / span 2"} height={"2 / span 1"}>
          <h3>Speed</h3>
        </GridCard>
        <GridCard width={"3 / span 3"} height={"4 / span 1"}>
          <h3>Time / Lap</h3>
        </GridCard>
        <GridCard width={"3 / span 3"} height={"4 / span 1"}>
          <h3>Time / Lap</h3>
        </GridCard>
        <GridCard width={"6 / span 2"} height={"3 / span 1"}>
          <h3>RPM (Rear)</h3>
        </GridCard>
        <GridCard width={"6 / span 2"} height={"2 / span 1"}>
          <h3>Location</h3>
        </GridCard>
      </div>
    </section>
  );
}
