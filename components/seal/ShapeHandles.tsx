"use client";

import { ThreeEvent, useThree } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { computeBody, FEATURES, featurePoint, FRONT_FLIPPER_RING, PIVOT_RING, ringPoint, SCALE, SEGMENTS } from "@/lib/seal/profile";
import type { ShapeParams } from "@/lib/seal/shape";
import { useGame } from "@/store/game";

interface HandleProps {
  param: keyof ShapeParams;
  position: [number, number, number];
  axis: [number, number, number];
  /** 參數每變動 1,控制點在世界座標移動多少 */
  unitsPerParam: number;
  color: string;
}

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();

/** 一個可拖動的控制點:沿著 axis 拖動來改變一個體型參數。 */
function Handle({ param, position, axis, unitsPerParam, color }: HandleProps) {
  const { camera, size } = useThree();
  const ref = useRef<THREE.Group>(null);
  const drag = useRef<{ x: number; y: number; sx: number; sy: number; start: number } | null>(null);
  const [hot, setHot] = useState(false);
  const setShape = useGame((s) => s.setShape);
  const setDragging = useGame((s) => s.setDragging);

  const quaternion = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...axis)),
    [axis],
  );

  const down = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    // 把拖動軸投影到螢幕上,之後用滑鼠位移在這條軸上的分量換算參數
    ref.current!.getWorldPosition(_a);
    _b.copy(_a).add(new THREE.Vector3(...axis));
    _a.project(camera);
    _b.project(camera);
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      sx: ((_b.x - _a.x) * size.width) / 2,
      sy: (-(_b.y - _a.y) * size.height) / 2,
      start: useGame.getState().shape[param],
    };
    setDragging(true);
  };

  const move = (e: ThreeEvent<PointerEvent>) => {
    const d = drag.current;
    if (!d) return;
    e.stopPropagation();
    const len2 = d.sx * d.sx + d.sy * d.sy || 1;
    const moved = ((e.clientX - d.x) * d.sx + (e.clientY - d.y) * d.sy) / len2;
    setShape({ [param]: d.start + moved / unitsPerParam });
  };

  const up = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return;
    drag.current = null;
    (e.target as Element).releasePointerCapture(e.pointerId);
    setDragging(false);
  };

  return (
    <group ref={ref} position={position} quaternion={quaternion} scale={hot ? 1.25 : 1}>
      {/* 比看起來大一點的隱形感應區,手指比較好按 */}
      <mesh
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerOver={() => {
          setHot(true);
          document.body.style.cursor = "grab";
        }}
        onPointerOut={() => {
          setHot(false);
          document.body.style.cursor = "";
        }}
      >
        <sphereGeometry args={[0.17, 8, 6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[0.075, 1]} />
        <meshStandardMaterial color={color} flatShading emissive={color} emissiveIntensity={0.35} />
      </mesh>
      {[1, -1].map((dir) => (
        <mesh key={dir} position={[0, dir * 0.15, 0]} rotation={[dir > 0 ? 0 : Math.PI, 0, 0]}>
          <coneGeometry args={[0.04, 0.08, 5]} />
          <meshStandardMaterial color="#ffffff" flatShading />
        </mesh>
      ))}
    </group>
  );
}

const AXIS_BACK: [number, number, number] = [-1, 0, 0];
const AXIS_Y: [number, number, number] = [0, 1, 0];
const AXIS_Z: [number, number, number] = [0, 0, 1];

/** 調整體型階段顯示在海豹身上的四個控制點。 */
export function ShapeHandles() {
  const shape = useGame((s) => s.shape);
  const body = useMemo(() => computeBody(shape), [shape]);
  const backTop = ringPoint(body.rings[PIVOT_RING - 2], 0);
  const nose = featurePoint(body, FEATURES.nose);
  const chestSide =ringPoint(body.rings[FRONT_FLIPPER_RING], SEGMENTS / 4);

  return (
    <group>
      {/* 身長:往後拉尾巴 */}
      <Handle
        param="length"
        color="#ff8fa3"
        axis={AXIS_BACK}
        unitsPerParam={0.33 * SCALE}
        position={[body.tail[0] - 0.24, body.tail[1], 0]}
      />
      <Handle
        param="girth"
        color="#ffb347"
        axis={AXIS_Y}
        unitsPerParam={0.47 * SCALE}
        position={[backTop[0], backTop[1] + 0.22, 0]}
      />
      <Handle
        param="head"
        color="#7ac8f5"
        axis={AXIS_Y}
        unitsPerParam={0.34 * SCALE}
        position={[body.top[0], body.top[1] + 0.22, 0]}
      />
      {/* 頭的高低:在鼻子前方上下拖 */}
      <Handle
        param="headLift"
        color="#b79cf0"
        axis={AXIS_Y}
        unitsPerParam={1}
        position={[nose[0] + 0.24, nose[1], 0]}
      />
      <Handle
        param="flipper"
        color="#8fd6a5"
        axis={AXIS_Z}
        unitsPerParam={0.3}
        position={[chestSide[0] + 0.25, 0.14, chestSide[2] + 0.22 * shape.flipper + 0.1]}
      />
    </group>
  );
}
