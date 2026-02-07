import type { MouseEventHandler } from "react";
import styles from "./GridCard.module.css";

export default function GridCard({
  children,
  width,
  height,
  onClick,
}: {
  children?: React.ReactNode;
  width?: string;
  height?: string;
  onClick?: MouseEventHandler;
}) {
  return (
    <div
      className={styles.wrapper}
      style={{ gridColumn: width, gridRow: height }}
      onClick={onClick}
    >
      <div className={styles.box}>{children}</div>
    </div>
  );
}
