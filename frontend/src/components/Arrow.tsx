import styles from "./Arrow.module.css";

export default function Arrow({
  x,
  y,
  angle,
}: {
  x?: number;
  y?: number;
  angle?: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        transform: `rotate(${angle}deg)`,
        height: "5%",
      }}
    >
      <div className={`${styles.arrow} ${styles.arrowFirst}`}></div>
      <div className={`${styles.arrow} ${styles.arrowSecond}`}></div>
    </div>
  );
}
