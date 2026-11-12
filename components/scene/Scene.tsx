"use client";

import { Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { Seal } from "@/components/seal/Seal";
import { ShapeHandles } from "@/components/seal/ShapeHandles";
import { Phase, useGame } from "@/store/game";
import { AirDecor, FloeDecor } from "./Decor";
import { Floe } from "./Floe";
import { Sea } from "./Sea";
import { HORIZON, Sky } from "./Sky";

const CAMERA: Record<Phase, [number, number, number]> = {
  paint: [4, 2.3, 5.2],
  shape: [2.2, 1.7, 5.2],
  play: [4.6, 3.2, 6.2],
};
const LOOK_AT = new THREE.Vector3(0, 0.55, 0);

/** 換階段時把鏡頭滑到該階段的預設位置,之後交還給玩家自由旋轉。 */
function CameraRig() {
  const phase = useGame((s) => s.phase);
  const camera = useThree((s) => s.camera);
  const anim = useRef(0);
  const goal = useRef(new THREE.Vector3());

  useEffect(() => {
    goal.current.set(...CAMERA[phase]);
    anim.current = 1.4;
  }, [phase]);

  useFrame((_, dt) => {
    if (anim.current <= 0) return;
    anim.current -= dt;
    camera.position.lerp(goal.current, 1 - Math.exp(-dt * 4.5));
  });
  return null;
}

/**
 * 三點打光:
 *  - 主光:暖色的太陽,從右前上方照下來,負責投影
 *  - 補光:天空與冰面的反射光(半球光 + 環境貼圖),讓暗面保持通透
 *  - 輪廓光:從左後方打一道冷白光,把海豹的邊緣從背景勾出來
 */
function Lights() {
  return (
    <>
      <hemisphereLight args={["#e6f4ff", "#a9d8ee", 0.42]} />
      <directionalLight
        position={[4.5, 8, 4]}
        intensity={2.9}
        color="#fff3df"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-3.6}
        shadow-camera-right={3.6}
        shadow-camera-top={3.6}
        shadow-camera-bottom={-3.6}
        shadow-camera-near={0.5}
        shadow-camera-far={24}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-5, 4, -5]} intensity={1.7} color="#d6ecff" />
      {/* 用幾塊發光板拼成的環境光,不需要下載任何貼圖 */}
      <Environment resolution={64} environmentIntensity={0.22}>
        <mesh scale={50}>
          <sphereGeometry args={[1, 16, 8]} />
          <meshBasicMaterial color="#bfe2f4" side={THREE.BackSide} />
        </mesh>
        <Lightformer form="circle" intensity={3} color="#ffffff" position={[0, 8, 0]} rotation-x={Math.PI / 2} scale={9} />
        <Lightformer intensity={1.6} color="#fff1dc" position={[6, 3, 5]} scale={7} target={[0, 0, 0]} />
        <Lightformer intensity={1.4} color="#d2e9ff" position={[-7, 2, -5]} scale={7} target={[0, 0, 0]} />
        <Lightformer form="circle" intensity={0.9} color="#e9f7ff" position={[0, -5, 0]} rotation-x={-Math.PI / 2} scale={12} />
      </Environment>
    </>
  );
}

export default function Scene() {
  const phase = useGame((s) => s.phase);
  const dragging = useGame((s) => s.dragging);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: CAMERA.paint, fov: 36, near: 0.1, far: 160 }}
      gl={{ antialias: true, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 0.95 }}
    >
      {/* 霧色與地平線同色,遠處的海面才會融進天空 */}
      <fog attach="fog" args={[HORIZON, 16, 48]} />
      <Sky />
      <Lights />

      <Sea />
      <AirDecor />
      <Floe>
        <FloeDecor />
        <Seal />
        {phase === "shape" && <ShapeHandles />}
      </Floe>

      <CameraRig />
      <OrbitControls
        makeDefault
        target={LOOK_AT}
        enabled={!dragging}
        enablePan={false}
        minDistance={3}
        maxDistance={10}
        minPolarAngle={0.5}
        maxPolarAngle={1.45}
        autoRotate={phase === "paint"}
        autoRotateSpeed={1.4}
      />
    </Canvas>
  );
}
