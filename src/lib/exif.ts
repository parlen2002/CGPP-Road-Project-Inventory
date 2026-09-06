/* EXIF GPS reader — extracts capture position from a geotagged JPEG in-browser. */

export function parseExifGPS(buf: ArrayBuffer): [number, number] | null {
  try {
    const dv = new DataView(buf);
    if (dv.byteLength < 12 || dv.getUint16(0) !== 0xffd8) return null;
    let off = 2;
    while (off + 4 < dv.byteLength) {
      const marker = dv.getUint16(off);
      if ((marker & 0xff00) !== 0xff00) return null;
      const type = marker & 0xff;
      if (type === 0xd8 || (type >= 0xd0 && type <= 0xd9) || type === 0x01) { off += 2; continue; }
      const len = dv.getUint16(off + 2);
      if (type === 0xe1 && off + 10 < dv.byteLength) {
        if (dv.getUint32(off + 4) === 0x45786966 && dv.getUint16(off + 8) === 0) return parseTiff(dv, off + 10);
      }
      off += 2 + len;
    }
    return null;
  } catch { return null; }
}

function parseTiff(dv: DataView, t0: number): [number, number] | null {
  const bom = dv.getUint16(t0);
  const le = bom === 0x4949;
  if (bom !== 0x4949 && bom !== 0x4d4d) return null;
  const u16 = (o: number) => dv.getUint16(t0 + o, le);
  const u32 = (o: number) => dv.getUint32(t0 + o, le);
  if (u16(2) !== 0x002a) return null;
  const ifd0 = u32(4);
  let gpsPtr = 0;
  const n = u16(ifd0);
  for (let i = 0; i < n; i++) {
    const e = ifd0 + 2 + i * 12;
    if (u16(e) === 0x8825) gpsPtr = u32(e + 8);
  }
  if (!gpsPtr) return null;
  let latRef = "N", lngRef = "E";
  let lat: number[] | null = null;
  let lng: number[] | null = null;
  const ng = u16(gpsPtr);
  for (let i = 0; i < ng; i++) {
    const e = gpsPtr + 2 + i * 12;
    const tag = u16(e);
    if (tag === 0x0001) latRef = String.fromCharCode(dv.getUint8(t0 + e + 8));
    else if (tag === 0x0003) lngRef = String.fromCharCode(dv.getUint8(t0 + e + 8));
    else if (tag === 0x0002) lat = rationals(dv, t0, e, le);
    else if (tag === 0x0004) lng = rationals(dv, t0, e, le);
  }
  if (!lat || !lng) return null;
  let la = lat[0] + lat[1] / 60 + lat[2] / 3600;
  let ln = lng[0] + lng[1] / 60 + lng[2] / 3600;
  if (latRef === "S") la = -la;
  if (lngRef === "W") ln = -ln;
  if (!isFinite(la) || !isFinite(ln) || Math.abs(la) > 90 || Math.abs(ln) > 180) return null;
  return [la, ln];
}

function rationals(dv: DataView, t0: number, entry: number, le: boolean): number[] {
  const ptr = dv.getUint32(t0 + entry + 8, le);
  const out: number[] = [];
  for (let i = 0; i < 3; i++) {
    const num = dv.getUint32(t0 + ptr + i * 8, le);
    const den = dv.getUint32(t0 + ptr + i * 8 + 4, le) || 1;
    out.push(num / den);
  }
  return out;
}

export function makeThumb(file: File, max = 150): Promise<string | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.width * k));
        c.height = Math.max(1, Math.round(img.height * k));
        c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.62));
      } catch { resolve(null); } finally { URL.revokeObjectURL(url); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

/** untouched original bytes as data URL — EXIF stays byte-for-byte intact */
export function readDataURL(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const fr = new FileReader();
    fr.onload = () => resolve(typeof fr.result === "string" ? fr.result : null);
    fr.onerror = () => resolve(null);
    fr.readAsDataURL(file);
  });
}
