/**
 * The points of the price-history line, as the dashboard file draws it: the values spread
 * evenly across `width`, the lowest 10 units above the bottom and the highest 16 below the
 * top. Returns `x,y` pairs ready for an SVG path; fewer than two values give a flat line.
 */
export function chartPoints(values: number[], width: number, height: number): string[] {
  if (values.length === 0) return [];
  const series = values.length === 1 ? [values[0], values[0]] : values;
  const min = Math.min(...series);
  const max = Math.max(...series);
  return series.map((value, index) => {
    const x = (index / (series.length - 1)) * width;
    const y = height - 10 - ((value - min) / (max - min || 1)) * (height - 26);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
}
