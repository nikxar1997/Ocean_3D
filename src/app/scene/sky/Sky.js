import { useThree, useFrame } from "@react-three/fiber";
import { useEffect } from "react";
import { SkyGraphics } from "./skyGraphics";

const skyGraphics = new SkyGraphics();

export default function Sky() {
  const { scene } = useThree();

  useEffect(() => {
    skyGraphics.init(scene);
    return () => skyGraphics.dispose(scene);
  }, [scene]);

  useFrame(({ clock, camera }) => {
    skyGraphics.update(clock.getElapsedTime(), camera);
  });

  return null;
}

export { skyGraphics };