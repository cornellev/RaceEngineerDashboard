export function Studio() {
  return (
    <>
      {/* Floor */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.2, 0]}
        receiveShadow
      >
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#333" roughness={0.6} metalness={0.1} />
      </mesh>
    </>
  );
}
