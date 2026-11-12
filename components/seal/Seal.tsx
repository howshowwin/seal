"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SealController } from "@/lib/actions/controller";
import { getPaintTexture } from "@/lib/seal/paint";
import { SealRig } from "@/lib/seal/rig";
import { world } from "@/lib/world";
import { useGame } from "@/store/game";

/** 把 SealRig(模型)和 SealController(動作)接進 React 場景。 */
export function Seal() {
  const rig = useMemo(() => new SealRig(getPaintTexture()), []);
  const controller = useMemo(() => new SealController(), []);
  const phase = useGame((s) => s.phase);
  const shape = useGame((s) => s.shape);
  const command = useGame((s) => s.command);
  const blob = useRef<THREE.Mesh>(null);
  const blobTexture = useMemo(() => makeBlobTexture(), []);

  useEffect(() => {
    rig.setShape(shape);
  }, [rig, shape]);

  useEffect(() => {
    controller.configure(phase === "play", (event, value) => {
      if (event === "land") {
        world.floeKick += value;
        world.splashCount++;
        world.splashPower = value;
      }
    });
    controller.reset(phase === "play" ? "spawn" : "idle");
  }, [controller, phase]);

  useEffect(() => {
    if (!command) return;
    if (command.name === "hop") controller.hop();
    else controller.play(command.name);
  }, [controller, command]);

  useEffect(() => () => rig.dispose(), [rig]);

  // 開發時可在瀏覽器主控台用 __seal 直接操作動作狀態機
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") (window as unknown as { __seal?: SealController }).__seal = controller;
  }, [controller]);

  useFrame((_, dt) => {
    controller.update(Math.min(dt, 0.05), shape);
    rig.applyPose(controller.pose, controller.base);
    world.sealX = rig.group.position.x;
    world.sealZ = rig.group.position.z;

    // 貼地的柔和陰影:跟著海豹走,跳得越高就越淡、越大
    const b = blob.current;
    if (b) {
      const g = rig.group;
      const height = Math.min(1, g.position.y / 1.6);
      b.position.set(g.position.x, 0.012, g.position.z);
      b.rotation.set(-Math.PI / 2, 0, g.rotation.y);
      b.scale.set((2.1 + height) * shape.length * g.scale.x, (1.5 + height) * shape.girth * g.scale.z, 1);
      (b.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - 0.75 * height);
    }
  });

  return (
    <>
      <mesh ref={blob} renderOrder={1}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={blobTexture} transparent depthWrite={false} color="#4a7499" />
      </mesh>
      <primitive
      object={rig.group}
      onPointerDown={(e: { stopPropagation(): void }) => {
        if (phase !== "play") return;
        e.stopPropagation();
        controller.hop();
      }}
      />
    </>
  );
}

/** 中間深、邊緣淡出的圓形漸層,當作貼地陰影的貼圖。 */
function makeBlobTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.55, "rgba(255,255,255,0.55)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}
