/**
 * Photo clustering for Smart Import.
 *
 * Algorithm:
 *  1. Sort photos by timestamp (photos with no timestamp go to a separate "undated" cluster).
 *  2. Walk the sorted list; start a new cluster whenever the gap between consecutive
 *     timestamps exceeds TIME_GAP_HOURS (default 14 h).
 *  3. Compute centroid lat/lng as the mean of all photos that carry GPS.
 *  4. Optionally reverse-geocode each centroid via Nominatim to get a human-readable
 *     place name (one request per cluster, respects 1 req/s rate limit).
 *  5. Generate a suggested event name from date + place.
 */

import { readPhotoExif } from './exif'

// ── Types ───────────────────────────────────────────────────────────────────

export interface PhotoWithMeta {
  file:        File
  previewUrl:  string          // object URL — caller must revoke when done
  timestamp:   Date | null
  lat:         number | null
  lng:         number | null
  make?:       string
  model?:      string
}

export interface PhotoCluster {
  id:          string          // random, client-side only
  photos:      PhotoWithMeta[]
  startTime:   Date | null     // earliest timestamp in cluster
  endTime:     Date | null     // latest timestamp in cluster
  centerLat:   number | null
  centerLng:   number | null
  location:    string | null   // reverse-geocoded place name
  name:        string          // suggested event name (editable)
  skip:        boolean         // user has toggled this cluster off
}

// ── Constants ───────────────────────────────────────────────────────────────

const TIME_GAP_HOURS = 14
const TIME_GAP_MS    = TIME_GAP_HOURS * 60 * 60 * 1000

// ── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

function formatDateRange(start: Date | null, end: Date | null): string {
  if (!start) return 'Undated photos'
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  if (!end || start.toDateString() === end.toDateString()) return fmt(start)
  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    // Same month — "3–7 Jun 2024"
    return `${start.getDate()}–${end.getDate()} ${start.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`
  }
  return `${fmt(start)} – ${fmt(end)}`
}

function clusterName(cluster: PhotoCluster): string {
  const date = formatDateRange(cluster.startTime, cluster.endTime)
  if (cluster.location) return `${cluster.location} · ${date}`
  return date
}

function computeCentroid(photos: PhotoWithMeta[]): { lat: number | null; lng: number | null } {
  const gps = photos.filter(p => p.lat !== null && p.lng !== null)
  if (gps.length === 0) return { lat: null, lng: null }
  const lat = gps.reduce((s, p) => s + p.lat!, 0) / gps.length
  const lng = gps.reduce((s, p) => s + p.lng!, 0) / gps.length
  return { lat, lng }
}

// ── EXIF reading ─────────────────────────────────────────────────────────────

/** Read EXIF from all files, creating object URLs for previews. */
export async function readAllExif(
  files: File[],
  onProgress?: (done: number, total: number) => void
): Promise<PhotoWithMeta[]> {
  const results: PhotoWithMeta[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const previewUrl = URL.createObjectURL(file)
    const exif = await readPhotoExif(file)
    results.push({
      file,
      previewUrl,
      timestamp: exif.timestamp,
      lat:       exif.lat,
      lng:       exif.lng,
      make:      exif.make,
      model:     exif.model,
    })
    onProgress?.(i + 1, files.length)
  }

  return results
}

// ── Clustering ────────────────────────────────────────────────────────────────

/** Group photos into time-based clusters. Returns clusters sorted oldest-first. */
export function clusterPhotos(photos: PhotoWithMeta[]): PhotoCluster[] {
  if (photos.length === 0) return []

  // Separate dated from undated
  const dated   = photos.filter(p => p.timestamp !== null)
    .sort((a, b) => a.timestamp!.getTime() - b.timestamp!.getTime())
  const undated = photos.filter(p => p.timestamp === null)

  const clusters: PhotoCluster[] = []

  // Build time-gap clusters from dated photos
  let current: PhotoWithMeta[] = []
  for (const photo of dated) {
    if (current.length === 0) {
      current.push(photo)
    } else {
      const prev = current[current.length - 1]
      const gap  = photo.timestamp!.getTime() - prev.timestamp!.getTime()
      if (gap > TIME_GAP_MS) {
        clusters.push(makeCluster(current))
        current = [photo]
      } else {
        current.push(photo)
      }
    }
  }
  if (current.length > 0) clusters.push(makeCluster(current))

  // Undated photos get their own cluster at the end
  if (undated.length > 0) {
    clusters.push(makeCluster(undated))
  }

  return clusters
}

function makeCluster(photos: PhotoWithMeta[]): PhotoCluster {
  const dated     = photos.filter(p => p.timestamp !== null)
  const startTime = dated.length ? dated[0].timestamp         : null
  const endTime   = dated.length ? dated[dated.length - 1].timestamp : null
  const { lat, lng } = computeCentroid(photos)

  const cluster: PhotoCluster = {
    id:        uid(),
    photos,
    startTime,
    endTime,
    centerLat: lat,
    centerLng: lng,
    location:  null,
    name:      '',
    skip:      false,
  }
  // Temporary name — will be updated by geocoding or used as-is
  cluster.name = clusterName(cluster)
  return cluster
}

// ── Reverse geocoding ─────────────────────────────────────────────────────────

interface NominatimResult {
  address?: {
    city?:         string
    town?:         string
    village?:      string
    county?:       string
    state?:        string
    country?:      string
    country_code?: string
  }
}

/** Fetch a human-readable place name from Nominatim (rate-limited to 1 req/s). */
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat.toFixed(6)}&lon=${lng.toFixed(6)}&format=json&zoom=10&addressdetails=1`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Memoalive/1.0 (jane.vita@gmail.com)' },
    })
    if (!res.ok) return null
    const data: NominatimResult = await res.json()
    const a = data.address ?? {}
    const place   = a.city ?? a.town ?? a.village ?? a.county ?? a.state
    const country = a.country_code?.toUpperCase()
    if (place && country) return `${place}, ${country}`
    if (place) return place
    return null
  } catch {
    return null
  }
}

/** Resolve location names for all clusters that have GPS centroids.
 *  Updates each cluster in-place and regenerates its name.
 *  Respects Nominatim's 1-request-per-second policy. */
export async function geocodeClusters(
  clusters: PhotoCluster[],
  onProgress?: (done: number, total: number) => void
): Promise<PhotoCluster[]> {
  const needsGeo = clusters.filter(c => c.centerLat !== null && c.centerLng !== null)
  let done = 0

  for (const cluster of needsGeo) {
    const place = await reverseGeocode(cluster.centerLat!, cluster.centerLng!)
    cluster.location = place
    cluster.name     = clusterName(cluster)
    done++
    onProgress?.(done, needsGeo.length)

    // Nominatim asks for max 1 req/s
    if (done < needsGeo.length) {
      await new Promise(r => setTimeout(r, 1050))
    }
  }

  return clusters
}
