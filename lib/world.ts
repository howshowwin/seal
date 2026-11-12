/** 每一幀都在變的共享狀態(不經過 React,避免重新渲染)。 */
export const world = {
  /** 海豹落地時累積的衝擊,由浮冰消化 */
  floeKick: 0,
  /** 海豹在浮冰上的位置,浮冰會往那一側傾斜 */
  sealX: 0,
  sealZ: 0,
  /** 每次落地 +1,水面漣漪用來偵測 */
  splashCount: 0,
  splashPower: 0,
};
