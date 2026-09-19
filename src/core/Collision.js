/**
 * Collision detection utilities for blade slicing
 */

/**
 * Checks if a line segment (p1 -> p2) intersects or gets within radius of circle (cx, cy, r).
 * @param {number} x1 - Segment start X
 * @param {number} y1 - Segment start Y
 * @param {number} x2 - Segment end X
 * @param {number} y2 - Segment end Y
 * @param {number} cx - Circle center X
 * @param {number} cy - Circle center Y
 * @param {number} r - Circle radius
 * @returns {{ hit: boolean, angle: number, closestX: number, closestY: number }}
 */
export function checkSegmentCircleIntersection(x1, y1, x2, y2, cx, cy, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  let closestX, closestY;

  if (lenSq === 0) {
    closestX = x1;
    closestY = y1;
  } else {
    // Project circle center onto segment
    const t = Math.max(0, Math.min(1, ((cx - x1) * dx + (cy - y1) * dy) / lenSq));
    closestX = x1 + t * dx;
    closestY = y1 + t * dy;
  }

  const distSq = (cx - closestX) * (cx - closestX) + (cy - closestY) * (cy - closestY);
  const hit = distSq <= r * r;

  // Calculate slice angle
  const angle = Math.atan2(dy, dx);

  return {
    hit,
    angle,
    closestX,
    closestY,
    dist: Math.sqrt(distSq),
  };
}
