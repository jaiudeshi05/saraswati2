import { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { useGLTF, Environment, Float, OrbitControls } from "@react-three/drei";

const AvatarModel = ({ type }: { type: string }) => {
  const { scene } = useGLTF(`/avatars/${type}.glb`);

  return (
    <Float floatIntensity={0.6} floatingRange={[-0.03, 0.03]} speed={1.5}>
      <primitive object={scene} scale={0.85} position={[0, -0.5, 0]} />
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
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={4}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 1.8}
        />
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
