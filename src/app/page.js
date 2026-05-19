"use client";
import styles from "./page.module.css";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, RandomizedLight, Stars } from "@react-three/drei";
import Ocean from "./scene/ocean/Ocean";
import Sky from "./scene/sky/Sky";
//d
export default function Home() {
  return (
    <div className={styles.mainScene}>
      <Canvas
        dpr={[1, 2]}
        gl={{
          powerPreference: "high-performance",
          alpha: true,
        }}
        camera={{ position: [0, 2, 16], fov: 50 }}
      >
        <OrbitControls
          enablePan={false}
          minPolarAngle={Math.PI * 0.1}
          maxPolarAngle={Math.PI * 0.55}
        />
        <directionalLight
          position={[30, 50, -20]}
          intensity={3}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />

        <ambientLight intensity={0.15} />
        <RandomizedLight
          castShadow
          amount={8}
          frames={100}
          position={[5, 5, -10]}
        />
        <Sky />
        <Ocean />
        <Stars
          radius={100}
          depth={50}
          count={5000}
          factor={4}
          saturation={0.5}
          fade
          speed={1}
        />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
          <planeGeometry args={[3000, 3000]} />
          <meshStandardMaterial color={"#2b4b7f"} />
        </mesh>
      </Canvas>
    </div>
  );
}
