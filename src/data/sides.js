export function matchesSide(filter, side) {
  return filter === 'all' || filter === side || (filter === 'both' && (side === 'left' || side === 'right'));
}
