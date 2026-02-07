type LineAnimationProps = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  thickness?: number;
  speed?: number; // lower = faster
};

export default function LineAnimation(props: LineAnimationProps) {
  const x1 = props.x1;
  const y1 = props.y1;
  const x2 = props.x2;
  const y2 = props.y2;
  const color = props.color || "#00ffff";
  const thickness = props.thickness || 2;
  const speed = props.speed || 1.5;

  const left = Math.min(x1, x2) - thickness;
  const top = Math.min(y1, y2) - thickness;
  const width = Math.abs(x2 - x1) + thickness * 2;
  const height = Math.abs(y2 - y1) + thickness * 2;

  return (
    <svg
      style={{
        position: "absolute",
        left,
        top,
        pointerEvents: "none",
        overflow: "visible",
        zIndex: 51,
      }}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      strokeWidth={thickness}
    >
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <line
        x1={x1 - left}
        y1={y1 - top}
        x2={x2 - left}
        y2={y2 - top}
        stroke={color}
        strokeWidth={thickness}
        strokeDasharray="8 12"
        filter="url(#glow)"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="0"
          to="40"
          dur={`${speed}s`}
          repeatCount="indefinite"
        />
      </line>
    </svg>
  );
}
