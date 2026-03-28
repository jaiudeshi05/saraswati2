import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Environment, Float } from "@react-three/drei";
import type { Group } from "three";

const AvatarModel = ({ type }: { type: string }) => {
  const { scene } = useGLTF(`/avatars/${type}.glb`);
  const groupRef = useRef<Group>(null);

  // Continuous slow Y-axis spin
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.4;
    }
  });

  return (
    <Float floatIntensity={0.6} floatingRange={[-0.03, 0.03]} speed={1.5}>
      <group ref={groupRef}>
        <primitive object={scene} scale={0.85} position={[0, -0.5, 0]} />
      </group>
    </Float>
  );
};

interface Avatar3DProps {
  type: "fatigued" | "distracted" | "rage" | "focused" | "confused";
}

const Avatar3D = ({ type }: Avatar3DProps) => {
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0, 4.5], fov: 40 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[-2, 3, 2]} intensity={1.5} color="#e8f0f8" />
        <directionalLight position={[2, 1, -1]} intensity={0.8} color="#ffd4b8" />
        <AvatarModel type={type} />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
};

useGLTF.preload("/avatars/fatigued.glb");
useGLTF.preload("/avatars/distracted.glb");
useGLTF.preload("/avatars/rage.glb");
useGLTF.preload("/avatars/focused.glb");
useGLTF.preload("/avatars/confused.glb");

export default Avatar3D;

