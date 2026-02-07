import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";

import CarModel from "./CarModel";
import { Studio } from "./Studio";

export default function CarScene() {
  return (
    <Canvas
      camera={{ position: [-2.5, 1, -2.5], fov: 45 }}
      gl={{ antialias: true }}
      onCreated={({ scene }) => {
        scene.background = new THREE.Color("#0a0a0a");
        scene.fog = new THREE.Fog("#0a0a0a", 5, 15);
      }}
      className="w-full h-full"
      shadows
    >
      <Suspense fallback={null}>
        {/* lights */}
        <ambientLight intensity={0.25} color="#222" />

        <directionalLight position={[50, 80, -50]} intensity={0.6} castShadow />
        <directionalLight position={[-10, 100, 10]} intensity={0.6} />

        {/* studio */}
        <Studio />

        {/* car */}
        <CarModel />

        {/* Optional controls (lock for hero sections later) */}
        <OrbitControls
          enableZoom={true}
          maxPolarAngle={Math.PI / 2}
          target={[0, 0, 0]}
        />

        {/* post-processing effects */}
        <EffectComposer>
          <Bloom
            intensity={1.6}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
          />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}
