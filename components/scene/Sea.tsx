"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { world } from "@/lib/world";
import { SeaDecor } from "./Decor";
import { FLOE_RADIUS } from "./Floe";

const WATER_Y = -0.24;

/** 低面數的海面:每一幀用正弦波推動頂點。 */
export function Sea() {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(110, 110, 96, 96);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const pos = geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, Math.sin(x * 0.6 + t * 1.1) * 0.07 + Math.cos(z * 0.5 + t * 0.8) * 0.07 + Math.sin((x + z) * 1.3 + t * 1.7) * 0.035);
    }
    pos.needsUpdate = true;
  });

  return (
    <group position={[0, WATER_Y, 0]}>
      <mesh geometry={geometry} receiveShadow>
        {/* 粗糙度調低,每個小面會各自反射天空,海面才有波光 */}
        <meshStandardMaterial color="#3fb0dc" flatShading roughness={0.55} metalness={0.05} />
      </mesh>
      <Ripples />
      <SeaDecor />
    </group>
  );
}

/** 海豹落地時,從浮冰邊緣擴散出去的漣漪。 */
function Ripples() {
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const state = useRef({ seen: 0, next: 0, life: [9, 9, 9], power: [0, 0, 0] });

  useFrame((_, dt) => {
    const s = state.current;
    if (world.splashCount !== s.seen) {
      s.seen = world.splashCount;
      s.life[s.next] = 0;
      s.power[s.next] = world.splashPower;
      s.next = (s.next + 1) % 3;
    }
    for (let i = 0; i < 3; i++) {
      const mesh = rings.current[i];
      if (!mesh) continue;
      s.life[i] += dt;
      const k = Math.min(1, s.life[i] / 1.6);
      mesh.visible = k < 1;
      mesh.scale.setScalar(FLOE_RADIUS * (1 + k * (0.5 + 0.35 * s.power[i])));
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - k) * (1 - k);
    }
  });

  return (
    <>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={(m) => {
            rings.current[i] = m;
          }}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.13, 0]}
          visible={false}
        >
          <ringGeometry args={[0.93, 1, 18]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

