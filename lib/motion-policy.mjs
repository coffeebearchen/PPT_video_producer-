// Central motion policy. Text is the protagonist; elements are punctuation.
// Keep every element speed below this ceiling and bias the palette toward slow.
export const MOTION_POLICY = {
  minSpeed: 0.16,
  maxSpeed: 0.50,
  // Three-element ensembles get a slow / medium / fast-relative rhythm.
  threeBand: [0.18, 0.32, 0.50],
  twoBand: [0.20, 0.44],
  soloRange: [0.18, 0.42],
  maxElementsPerPage: 3
};

export function clampElementSpeed(value) {
  return Math.max(MOTION_POLICY.minSpeed, Math.min(MOTION_POLICY.maxSpeed, Number(value) || MOTION_POLICY.minSpeed));
}
