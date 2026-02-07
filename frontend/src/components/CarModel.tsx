import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import type { ThreeElements } from "@react-three/fiber";
import { useEffect } from "react";

type CarModelProps = ThreeElements["group"];

export default function CarModel(props: CarModelProps) {
  const { scene } = useGLTF("/models/car.glb");

  useEffect(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
      }
    });
  }, [scene]);

  return (
    <primitive
      object={scene}
      scale={40}
      position={[0, -0.2, 0]}
      rotation={[0, Math.PI, 0]}
      {...props}
    />
  );
}
