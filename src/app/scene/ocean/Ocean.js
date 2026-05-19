import { useThree, useFrame } from "@react-three/fiber";
import { useEffect } from "react";
import { OceanGraphics } from "./oceanGraphics";

const oceanGraphics = new OceanGraphics();

export default function Ocean() {
  const { scene } = useThree();

  useEffect(() => {
    oceanGraphics.init(scene);
    return () => oceanGraphics.dispose(scene);
  }, [scene]);

  useFrame(({ clock, camera }) => {
    oceanGraphics.update(clock.getElapsedTime(), camera);
  });

  return null;
}

export { oceanGraphics };