/**
 * Minimal JPEG EXIF reader — extracts timestamp and GPS from photo files.
 * Written for modern smartphone photos (JPEG + little-endian TIFF).
 * Also handles big-endian TIFF (older cameras). Gracefully returns nulls
 * for missing / corrupt data.
 *
 * People face-region tags (XMP mwg-rs:Regions, apple:PersonInImage) are noted
 * for future implementation — parsing requires a full XMP/XML stack and varies
 * significantly between manufacturers.
 */

export interface RawExif {
  timestamp:  Date | null   // EXIF DateTimeOriginal
  lat:        number | null // decimal degrees, negative = S
  lng:        number | null // decimal degrees, negative = W
  make?:      string        // Camera make (optional bonus)
  model?:     string        // Camera model (optional bonus)
}

// TIFF tag IDs
const TAG_MAKE         = 0x010F
const TAG_MODEL        = 0x0110
const TAG_EXIF_IFD    = 0x8769  // pointer to ExifIFD in IFD0
const TAG_GPS_IFD     = 0x8825  // pointer to GPS IFD in IFD0
const TAG_DATETIME_ORIGINAL = 0x9003  // DateTimeOriginal in ExifIFD
const GPS_LAT_REF     = 0x0001
const GPS_LAT         = 0x0002
const GPS_LON_REF     = 0x0003
const GPS_LON         = 0x0004

// TIFF type byte-sizes
const TYPE_BYTE_SIZE: Record<number, number> = {
  1: 1, 2: 1, 3: 2, 4: 4, 5: 8,
  6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8,
}

interface IFDEntry {
  tag:      number
  type:     number
  count:    number
  rawValue: number  // the 4-byte value / offset field as a uint32
}

function readU16(view: DataView, offset: number, le: boolean) {
  return le ? view.getUint16(offset, true) : view.getUint16(offset)
}

function readU32(view: DataView, offset: number, le: boolean) {
  return le ? view.getUint32(offset, true) : view.getUint32(offset)
}

function parseIFD(view: DataView, offset: number, le: boolean): IFDEntry[] {
  if (offset + 2 > view.byteLength) return []
  const count = readU16(view, offset, le)
  if (count > 500) return []  // sanity check
  const entries: IFDEntry[] = []
  for (let i = 0; i < count; i++) {
    const e = offset + 2 + i * 12
    if (e + 12 > view.byteLength) break
    entries.push({
      tag:      readU16(view, e,     le),
      type:     readU16(view, e + 2, le),
      count:    readU32(view, e + 4, le),
      rawValue: readU32(view, e + 8, le),
    })
  }
  return entries
}

function valueOffset(entry: IFDEntry, tiffBase: number): number | null {
  const size = (TYPE_BYTE_SIZE[entry.type] ?? 1) * entry.count
  return size > 4 ? tiffBase + entry.rawValue : null  // null = inline
}

function readAscii(view: DataView, offset: number, count: number): string {
  let s = ''
  for (let i = 0; i < count; i++) {
    const c = view.getUint8(offset + i)
    if (c === 0) break
    s += String.fromCharCode(c)
  }
  return s.trim()
}

function readRationals(view: DataView, offset: number, count: number, le: boolean): number[] {
  const out: number[] = []
  for (let i = 0; i < count; i++) {
    const num = readU32(view, offset + i * 8,     le)
    const den = readU32(view, offset + i * 8 + 4, le)
    out.push(den === 0 ? 0 : num / den)
  }
  return out
}

/** Convert DMS rationals + hemisphere ref to decimal degrees. */
function dmsToDecimal(rationals: number[], ref: string): number {
  const deg = rationals[0] ?? 0
  const min = rationals[1] ?? 0
  const sec = rationals[2] ?? 0
  const decimal = deg + min / 60 + sec / 3600
  return ref === 'S' || ref === 'W' ? -decimal : decimal
}

/** Read the first ASCII character from an inline IFD value (for GPS ref tags). */
function inlineAsciiChar(rawValue: number, le: boolean): string {
  const code = le ? rawValue & 0xFF : (rawValue >>> 24) & 0xFF
  return String.fromCharCode(code)
}

// ── Public API ─────────────────────────────────────────────────────────────────

/** Parse EXIF metadata from a JPEG ArrayBuffer. */
export function parseExifBuffer(buffer: ArrayBuffer): RawExif {
  const result: RawExif = { timestamp: null, lat: null, lng: null }

  try {
    const view = new DataView(buffer)
    if (view.byteLength < 12) return result

    // Must start with JPEG SOI
    if (view.getUint16(0) !== 0xFFD8) return result

    let pos = 2
    while (pos < view.byteLength - 4) {
      if (view.getUint8(pos) !== 0xFF) break
      const marker = view.getUint8(pos + 1)

      if (marker === 0xE1) {
        // APP1 segment
        const segLen = view.getUint16(pos + 2)

        // Look for "Exif\0\0" header (bytes 4-9 of APP1)
        if (
          pos + 10 < view.byteLength &&
          view.getUint8(pos + 4) === 0x45 &&  // E
          view.getUint8(pos + 5) === 0x78 &&  // x
          view.getUint8(pos + 6) === 0x69 &&  // i
          view.getUint8(pos + 7) === 0x66     // f
        ) {
          const tiffBase = pos + 10  // TIFF data starts after "Exif\0\0"

          // Byte order mark ("II" = LE, "MM" = BE)
          const bom = view.getUint16(tiffBase)
          if (bom !== 0x4949 && bom !== 0x4D4D) { pos += 2 + segLen; continue }
          const le = bom === 0x4949

          // Verify TIFF magic (42)
          if (readU16(view, tiffBase + 2, le) !== 42) { pos += 2 + segLen; continue }

          // IFD0
          const ifd0Off  = tiffBase + readU32(view, tiffBase + 4, le)
          const ifd0     = parseIFD(view, ifd0Off, le)
          const byTag    = Object.fromEntries(ifd0.map(e => [e.tag, e]))

          // Camera make / model (bonus info)
          if (byTag[TAG_MAKE]) {
            const off = valueOffset(byTag[TAG_MAKE], tiffBase) ?? ifd0Off  // inline if ≤4 chars
            result.make = readAscii(view, off, byTag[TAG_MAKE].count)
          }
          if (byTag[TAG_MODEL]) {
            const off = valueOffset(byTag[TAG_MODEL], tiffBase) ?? ifd0Off
            result.model = readAscii(view, off, byTag[TAG_MODEL].count)
          }

          // ExifIFD → DateTimeOriginal
          if (byTag[TAG_EXIF_IFD]) {
            const exifOff    = tiffBase + byTag[TAG_EXIF_IFD].rawValue
            const exifByTag  = Object.fromEntries(parseIFD(view, exifOff, le).map(e => [e.tag, e]))
            const dtEntry    = exifByTag[TAG_DATETIME_ORIGINAL]

            if (dtEntry && dtEntry.type === 2 /* ASCII */ && dtEntry.count >= 19) {
              // count > 4, so rawValue is an offset
              const dtStr = readAscii(view, tiffBase + dtEntry.rawValue, dtEntry.count)
              // "YYYY:MM:DD HH:MM:SS"
              const m = dtStr.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/)
              if (m) {
                result.timestamp = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])
              }
            }
          }

          // GPS IFD → lat / lng
          if (byTag[TAG_GPS_IFD]) {
            const gpsOff    = tiffBase + byTag[TAG_GPS_IFD].rawValue
            const gpsByTag  = Object.fromEntries(parseIFD(view, gpsOff, le).map(e => [e.tag, e]))

            const latRefE   = gpsByTag[GPS_LAT_REF]
            const latE      = gpsByTag[GPS_LAT]
            const lonRefE   = gpsByTag[GPS_LON_REF]
            const lonE      = gpsByTag[GPS_LON]

            if (latRefE && latE && lonRefE && lonE &&
                latE.type === 5 /* RATIONAL */ && lonE.type === 5) {
              const latRef = inlineAsciiChar(latRefE.rawValue, le)
              const lonRef = inlineAsciiChar(lonRefE.rawValue, le)
              const latRat = readRationals(view, tiffBase + latE.rawValue, 3, le)
              const lonRat = readRationals(view, tiffBase + lonE.rawValue, 3, le)
              result.lat = dmsToDecimal(latRat, latRef)
              result.lng = dmsToDecimal(lonRat, lonRef)
            }
          }

          break  // Parsed the Exif APP1 — done
        }
        pos += 2 + segLen
      } else if (marker === 0xDA || marker === 0xD9) {
        break  // SOS or EOI — no more metadata
      } else {
        if (pos + 3 >= view.byteLength) break
        pos += 2 + view.getUint16(pos + 2)
      }
    }
  } catch {
    // Swallow any parse errors; return whatever we have
  }

  return result
}

/** Convenience: read EXIF from a browser File object (reads only the first 128 KB). */
export async function readPhotoExif(file: File): Promise<RawExif> {
  try {
    const buf = await file.slice(0, 131_072).arrayBuffer()
    return parseExifBuffer(buf)
  } catch {
    return { timestamp: null, lat: null, lng: null }
  }
}
