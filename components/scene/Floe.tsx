"use client";

import { useFrame } from "@react-three/fiber";
import { ReactNode, useMemo, useRef } from "react";
import * as THREE from "three";
import { world } from "@/lib/world";

export const FLOE_RADIUS = 2.4;
const THICKNESS = 0.55;

/** 用固定種子的亂數,讓浮冰每次載入都長得一樣。 */
function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

function makeFloeGeometry() {
  const geo = new THREE.CylinderGeometry(FLOE_RADIUS, FLOE_RADIUS * 0.82, THICKNESS, 9, 1);
  const rnd = seeded(7);
  const pos = geo.getAttribute("position");
  const jitter = new Map<string, number>();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    if (Math.hypot(x, z) < 0.01) continue;
    // 同一個角度的頂點用同一個偏移,邊緣才不會裂開
    const key = Math.round(Math.atan2(z, x) * 100).toString();
    if (!jitter.has(key)) jitter.set(key, 0.82 + rnd() * 0.3);
    const k = jitter.get(key)!;
    pos.setX(i, x * k);
    pos.setZ(i, z * k);
  }
  geo.translate(0, -THICKNESS / 2, 0);
  geo.computeVertexNormals();
  return geo;
}

/** 小浮冰:緩慢起伏,海豹落地時會下沉回彈,並往海豹站的那一側傾斜。 */
export function Floe({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const spring = useRef({ y: 0, v: 0 });
  const geometry = useMemo(() => makeFloeGeometry(), []);

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = spring.current;
    s.v -= world.floeKick * 0.9;
    world.floeKick = 0;
    s.v += (-55 * s.y - 7 * s.v) * dt;
    s.y += s.v * dt;

    const t = clock.elapsedTime;
    const g = ref.current!;
    g.position.y = s.y + Math.sin(t * 0.9) * 0.03;
    const k = 1 - Math.exp(-dt * 5);
    g.rotation.z += (-world.sealX * 0.05 + Math.sin(t * 0.7) * 0.012 - g.rotation.z) * k;
    g.rotation.x += (world.sealZ * 0.05 + Math.cos(t * 0.6) * 0.012 - g.rotation.x) * k;
  });

  return (
    <group ref={ref}>
      <mesh geometry={geometry} receiveShadow>
        <meshStandardMaterial color="#eaf6fc" flatShading roughness={0.9} />
      </mesh>
      {children}
    </group>
  );
}
