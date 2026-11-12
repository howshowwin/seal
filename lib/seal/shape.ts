/** 海豹體型參數。1 = 預設體型。 */
export interface ShapeParams {
  length: number;
  girth: number;
  head: number;
  flipper: number;
  /** 頭的高低:脖子伸長的距離,0 = 預設(也是最低) */
  headLift: number;
}

export const DEFAULT_SHAPE: ShapeParams = { length: 1, girth: 1, head: 1, flipper: 1, headLift: 0 };

export const SHAPE_RANGE: Record<keyof ShapeParams, [number, number]> = {
  length: [0.8, 1.35],
  girth: [0.85, 1.25],
  head: [0.85, 1.2],
  flipper: [0.6, 1.6],
  headLift: [0, 0.4],
};

export const SHAPE_LABEL: Record<keyof ShapeParams, string> = {
  length: "身長",
  girth: "胖瘦",
  head: "頭的大小",
  flipper: "鰭的大小",
  headLift: "頭的高低",
};
