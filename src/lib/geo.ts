/* Planar geometry engine — browser preview of the PostGIS pipeline. */

export type LatLng = [number, number]; // [lat, lng] WGS84
export type XY = [number, number];     // [x east, y north] meters

const R = 6378137;
const D2R = Math.PI / 180;

export const mPerDegLng = (lat: number) => R * D2R * Math.cos(lat * D2R);
export const M_PER_DEG_LAT = 110574;

export const refLatOf = (pts: LatLng[]) => pts.reduce((s, p) => s + p[0], 0) / Math.max(1, pts.length);

export function toXY(pts: LatLng[], lat0?: number): XY[] {
  const ref = lat0 ?? refLatOf(pts);
  const kx = mPerDegLng(ref);
  return pts.map(([la, ln]) => [ln * kx, la * M_PER_DEG_LAT]);
}

export function toLatLng(pts: XY[], lat0: number): LatLng[] {
  const kx = mPerDegLng(lat0);
  return pts.map(([x, y]) => [y / M_PER_DEG_LAT, x / kx]);
}

export function lineLengthM(line: LatLng[]): number {
  const p = toXY(line);
  let d = 0;
  for (let i = 1; i < p.length; i++) d += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
  return d;
}

export function polygonAreaM2(ring: LatLng[]): number {
  const p = toXY(ring);
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i];
    const [x2, y2] = p[(i + 1) % p.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

const norm = (v: XY): XY => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };

/* Flat-sided parallel buffer — corridor never extends past start/end station. */
export function corridorPolygon(line: LatLng[], radiusM: number): LatLng[] {
  if (line.length < 2 || radiusM <= 0) return [];
  const P = toXY(line);
  const lat0 = refLatOf(line);
  const n = P.length;
  const segN: XY[] = [];
  for (let i = 0; i < n - 1; i++) {
    const [dx, dy] = [P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]];
    segN.push(norm([-dy, dx]));
  }
  const left: XY[] = [];
  const right: XY[] = [];
  for (let i = 0; i < n; i++) {
    let dir: XY;
    if (i === 0) dir = segN[0];
    else if (i === n - 1) dir = segN[n - 2];
    else dir = norm([segN[i - 1][0] + segN[i][0], segN[i - 1][1] + segN[i][1]]);
    const ref = segN[Math.min(i, n - 2)];
    const dot = Math.max(0.3, dir[0] * ref[0] + dir[1] * ref[1]);
    const off = Math.min(radiusM / dot, radiusM * 3);
    left.push([P[i][0] + dir[0] * off, P[i][1] + dir[1] * off]);
    right.push([P[i][0] - dir[0] * off, P[i][1] - dir[1] * off]);
  }
  return toLatLng([...left, ...right.reverse()], lat0);
}

export function corridorSegmentQuads(line: LatLng[], radiusM: number): XY[][] {
  const P = toXY(line);
  const quads: XY[][] = [];
  for (let i = 0; i < P.length - 1; i++) {
    const [dx, dy] = [P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]];
    const nv = norm([-dy, dx]);
    const o: XY = [nv[0] * radiusM, nv[1] * radiusM];
    let q: XY[] = [
      [P[i][0] + o[0], P[i][1] + o[1]],
      [P[i + 1][0] + o[0], P[i + 1][1] + o[1]],
      [P[i + 1][0] - o[0], P[i + 1][1] - o[1]],
      [P[i][0] - o[0], P[i][1] - o[1]],
    ];
    let area = 0;
    for (let k = 0; k < q.length; k++) {
      const [x1, y1] = q[k];
      const [x2, y2] = q[(k + 1) % q.length];
      area += x1 * y2 - x2 * y1;
    }
    if (area < 0) q = q.slice().reverse(); // CCW for Sutherland–Hodgman
    quads.push(q);
  }
  return quads;
}

function intersect(p1: XY, p2: XY, a: XY, b: XY): XY {
  const dx = p2[0] - p1[0], dy = p2[1] - p1[1];
  const ex = b[0] - a[0], ey = b[1] - a[1];
  const den = dx * ey - dy * ex || 1e-9;
  const t = ((a[0] - p1[0]) * ey - (a[1] - p1[1]) * ex) / den;
  return [p1[0] + t * dx, p1[1] + t * dy];
}

export function clipConvex(subject: XY[], clip: XY[]): XY[] | null {
  let out = subject.slice();
  for (let i = 0; i < clip.length && out.length; i++) {
    const A = clip[i];
    const B = clip[(i + 1) % clip.length];
    const inp = out;
    out = [];
    const side = (p: XY) => (B[0] - A[0]) * (p[1] - A[1]) - (B[1] - A[1]) * (p[0] - A[0]);
    for (let j = 0; j < inp.length; j++) {
      const cur = inp[j];
      const prev = inp[(j + inp.length - 1) % inp.length];
      const cIn = side(cur) >= 0;
      const pIn = side(prev) >= 0;
      if (cIn) { if (!pIn) out.push(intersect(prev, cur, A, B)); out.push(cur); }
      else if (pIn) out.push(intersect(prev, cur, A, B));
    }
  }
  return out.length >= 3 ? out : null;
}

const xyArea = (p: XY[]) => {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i];
    const [x2, y2] = p[(i + 1) % p.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
};

export function clippedAreaM2(lotRing: LatLng[], line: LatLng[], radiusM: number): number {
  const lat0 = refLatOf(line);
  const lotXY = toXY(lotRing, lat0);
  const quads = corridorSegmentQuads(line, radiusM);
  let total = 0;
  for (const q of quads) {
    const c = clipConvex(lotXY, q);
    if (c) total += xyArea(c);
  }
  return total;
}

export function nearestBarangay(lat: number, lng: number, points: Record<string, LatLng>): string {
  let best = "—";
  let bd = Infinity;
  for (const [name, [la, ln]] of Object.entries(points)) {
    const d = (la - lat) ** 2 + (ln - lng) ** 2;
    if (d < bd) { bd = d; best = name; }
  }
  return best;
}

export const centroidOf = (ring: LatLng[]): LatLng => [
  ring.reduce((s, p) => s + p[0], 0) / ring.length,
  ring.reduce((s, p) => s + p[1], 0) / ring.length,
];

export const fmtArea = (m2: number) =>
  m2 >= 10000 ? `${(m2 / 10000).toLocaleString("en-PH", { maximumFractionDigits: 2 })} ha`
    : `${Math.round(m2).toLocaleString("en-PH")} m²`;

export const fmtKm = (m: number) => m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
