/**
 * Reads "focal length in 35 mm film" from a JPEG's EXIF data (tag 0xA405), if the camera wrote it.
 * Used to estimate how far the phone was from the hand. Returns null when not present.
 */
export function focal35FromJpeg(buf: ArrayBuffer): number | null {
  const v = new DataView(buf);
  if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return null;
  let off = 2;
  while (off + 4 < v.byteLength) {
    const marker = v.getUint16(off);
    const len = v.getUint16(off + 2);
    if ((marker & 0xff00) !== 0xff00 || len < 2) return null;
    if (marker === 0xffe1 && v.getUint32(off + 4) === 0x45786966) return readTiff(v, off + 10, Math.min(v.byteLength, off + 2 + len));
    if (marker === 0xffda) return null; // image data starts: no EXIF
    off += 2 + len;
  }
  return null;
}

function readTiff(v: DataView, start: number, end: number): number | null {
  if (start + 8 > end) return null;
  const le = v.getUint16(start) === 0x4949;
  const u16 = (o: number) => v.getUint16(start + o, le);
  const u32 = (o: number) => v.getUint32(start + o, le);
  const findTag = (ifd: number, tag: number) => {
    if (start + ifd + 2 > end) return null;
    const n = u16(ifd);
    for (let i = 0; i < n; i++) {
      const e = ifd + 2 + i * 12;
      if (start + e + 12 > end) return null;
      if (u16(e) === tag) return { type: u16(e + 2), value: e + 8 };
    }
    return null;
  };
  const exifPtr = findTag(u32(4), 0x8769);
  if (!exifPtr) return null;
  const f = findTag(u32(exifPtr.value), 0xa405);
  if (!f) return null;
  const val = f.type === 3 ? u16(f.value) : f.type === 4 ? u32(f.value) : 0;
  return val >= 10 && val <= 300 ? val : null;
}
