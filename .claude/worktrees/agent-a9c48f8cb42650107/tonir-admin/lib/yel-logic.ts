export function calcTierLevel(points: number, mins: Record<number, number>): number {
  if (points >= mins[4]) return 4
  if (points >= mins[3]) return 3
  if (points >= mins[2]) return 2
  return 1
}

export function genYelCode(): string {
  return 'YEL-' + Math.random().toString(36).substring(2, 8).toUpperCase()
}
