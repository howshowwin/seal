"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/** 地平線的顏色:霧必須用同一個顏色,海面才會自然地融進天空。 */
export const HORIZON = "#e6f6fc";
const LOW_SKY = "#b9e6fa";
const ZENITH = "#6cc3f2";

/**
 * 天空球:由下往上從地平線的淡色漸層到天頂的藍。
 * 畫在 3D 場景裡(而不是網頁背景),轉動鏡頭時地平線才會待在正確的位置。
 */
function SkyDome() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        toneMapped: false,
        uniforms: {
          horizon: { value: new THREE.Color(HORIZON) },
          low: { value: new THREE.Color(LOW_SKY) },
          zenith: { value: new THREE.Color(ZENITH) },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 horizon;
          uniform vec3 low;
          uniform vec3 zenith;
          varying vec3 vDir;
          void main() {
            float h = normalize(vDir).y;
            vec3 col = mix(horizon, low, smoothstep(0.0, 0.22, h));
            col = mix(col, zenith, smoothstep(0.15, 0.85, h));
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    [],
  );
  return (
    <mesh material={material} renderOrder={-1}>
      <sphereGeometry args={[75, 24, 16]} />
    </mesh>
  );
}

const CLOUDS: { at: [number, number, number]; size: number; speed: number }[] = [
  { at: [-22, 11, -30], size: 3.2, speed: 0.25 },
  { at: [6, 14, -36], size: 4, speed: 0.18 },
  { at: [26, 10, -26], size: 2.8, speed: 0.3 },
  { at: [-34, 13, -8], size: 3.4, speed: 0.22 },
  { at: [34, 15, 6], size: 3.6, speed: 0.2 },
  { at: [-10, 12, 34], size: 3, speed: 0.26 },
  { at: [18, 16, 32], size: 4.2, speed: 0.16 },
];
// 一朵雲 = 幾顆大小不一的低面數圓球
const PUFFS: [number, number, number, number][] = [
  [0, 0, 0, 1],
  [1.1, -0.1, 0.1, 0.75],
  [-1.15, -0.15, -0.1, 0.7],
  [0.45, 0.45, -0.2, 0.7],
  [-0.5, 0.3, 0.3, 0.6],
];
const WRAP = 45;

/** 低面數的雲,慢慢往同一個方向飄,飄出邊界就從另一邊回來。 */
function Clouds() {
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame((_, dt) => {
    refs.current.forEach((g, i) => {
      if (!g) return;
      g.position.x += CLOUDS[i].speed * Math.min(dt, 0.05);
      if (g.position.x > WRAP) g.position.x = -WRAP;
    });
  });
  return (
    <>
      {CLOUDS.map((c, i) => (
        <group
          key={i}
          ref={(g) => {
            refs.current[i] = g;
          }}
          position={c.at}
          scale={[c.size, c.size * 0.62, c.size * 0.8]}
        >
          {PUFFS.map(([x, y, z, r], n) => (
            <mesh key={n} position={[x, y, z]} scale={r}>
              <icosahedronGeometry args={[1, 1]} />
              <meshStandardMaterial color="#ffffff" emissive="#dfeffa" emissiveIntensity={0.55} flatShading fog={false} roughness={1} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
}

export function Sky() {
  return (
    <>
      <SkyDome />
      <Clouds />
    </>
  );
}
