/**
 * A predefined palette of friendly device names paired with a unique color.
 * Each entry is deterministically selected based on the user's Firebase UID.
 */
const PALETTE = [
  { name: 'Red Fox', color: '#ef4444' },
  { name: 'Blue Bear', color: '#3b82f6' },
  { name: 'Green Owl', color: '#22c55e' },
  { name: 'Purple Wolf', color: '#8b5cf6' },
  { name: 'Orange Hawk', color: '#f97316' },
  { name: 'Pink Deer', color: '#ec4899' },
  { name: 'Teal Lynx', color: '#14b8a6' },
  { name: 'Gold Crow', color: '#eab308' },
];

function simpleHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Returns a stable { name, color } identity for a given Firebase userId.
 * The same userId always maps to the same name and color.
 */
export function getDeviceIdentity(userId: string): { name: string; color: string } {
  const entry = PALETTE[simpleHash(userId) % PALETTE.length];
  return { name: entry.name, color: entry.color };
}
