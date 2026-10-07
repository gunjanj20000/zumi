import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

// Create directories
const iconsDir = path.resolve('public/icons')
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true })
}

// 1. Generate Favicon SVG (Friendly smiling Zumi speaker icon)
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff5e62" />
      <stop offset="50%" stop-color="#ff9966" />
      <stop offset="100%" stop-color="#8a2387" />
    </linearGradient>
    <linearGradient id="faceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#fff1f2" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#4a0e2e" flood-opacity="0.25"/>
    </filter>
  </defs>

  <!-- Background rounded squircle -->
  <rect x="24" y="24" width="464" height="464" rx="112" fill="url(#bgGrad)" />

  <!-- Outer sound waves -->
  <path d="M 370 180 A 100 100 0 0 1 370 332" stroke="#ffffff" stroke-width="24" stroke-linecap="round" fill="none" opacity="0.85"/>
  <path d="M 410 140 A 150 150 0 0 1 410 372" stroke="#ffffff" stroke-width="24" stroke-linecap="round" fill="none" opacity="0.6"/>

  <!-- Speaker Cone / Character Body -->
  <g filter="url(#shadow)">
    <!-- Main head/speaker body -->
    <rect x="130" y="160" width="170" height="192" rx="48" fill="url(#faceGrad)"/>
    
    <!-- Speaker horn triangle -->
    <path d="M 230 190 L 320 140 L 320 372 L 230 322 Z" fill="url(#faceGrad)"/>
  </g>

  <!-- Cute Eyes -->
  <circle cx="180" cy="235" r="14" fill="#1e1b4b"/>
  <circle cx="240" cy="235" r="14" fill="#1e1b4b"/>
  <!-- Eye sparkles -->
  <circle cx="184" cy="231" r="5" fill="#ffffff"/>
  <circle cx="244" cy="231" r="5" fill="#ffffff"/>

  <!-- Cheerful Smile -->
  <path d="M 194 266 Q 210 286 226 266" stroke="#f43f5e" stroke-width="7" stroke-linecap="round" fill="none"/>

  <!-- Rosy Cheeks -->
  <ellipse cx="165" cy="265" rx="10" ry="6" fill="#fda4af" opacity="0.8"/>
  <ellipse cx="255" cy="265" rx="10" ry="6" fill="#fda4af" opacity="0.8"/>

  <!-- Star sparkle near top left -->
  <path d="M 110 110 L 116 128 L 134 134 L 116 140 L 110 158 L 104 140 L 86 134 L 104 128 Z" fill="#fef08a"/>
</svg>`

fs.writeFileSync(path.resolve('public/favicon.svg'), svgContent)

// Generate pure uncompressed/deflated RGBA PNG
function createPNG(width, height) {
  // CRC Table
  const crcTable = []
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    }
    crcTable[n] = c
  }

  function crc32(buf) {
    let crc = 0xffffffff
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
    }
    return (crc ^ 0xffffffff) >>> 0
  }

  function makeChunk(type, data) {
    const len = data.length
    const buf = Buffer.alloc(4 + 4 + len + 4)
    buf.writeUInt32BE(len, 0)
    buf.write(type, 4, 4, 'ascii')
    data.copy(buf, 8)
    const crcBuf = Buffer.concat([Buffer.from(type, 'ascii'), data])
    buf.writeUInt32BE(crc32(crcBuf), 8 + len)
    return buf
  }

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type (RGBA)
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace
  const ihdrChunk = makeChunk('IHDR', ihdr)

  // Generate image data with warm gradient and rounded squircle
  const rawBytes = Buffer.alloc((width * 4 + 1) * height)
  let offset = 0
  const cornerR = width * 0.22

  for (let y = 0; y < height; y++) {
    rawBytes[offset++] = 0 // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      // Rounded corner check
      let inCorner = false
      let dist = 0
      if (x < cornerR && y < cornerR) {
        dist = Math.hypot(x - cornerR, y - cornerR)
        if (dist > cornerR) inCorner = true
      } else if (x > width - cornerR && y < cornerR) {
        dist = Math.hypot(x - (width - cornerR), y - cornerR)
        if (dist > cornerR) inCorner = true
      } else if (x < cornerR && y > height - cornerR) {
        dist = Math.hypot(x - cornerR, y - (height - cornerR))
        if (dist > cornerR) inCorner = true
      } else if (x > width - cornerR && y > height - cornerR) {
        dist = Math.hypot(x - (width - cornerR), y - (height - cornerR))
        if (dist > cornerR) inCorner = true
      }

      if (inCorner) {
        rawBytes[offset++] = 0
        rawBytes[offset++] = 0
        rawBytes[offset++] = 0
        rawBytes[offset++] = 0
      } else {
        const t = (x + y) / (width + height)
        // Coral to purple gradient (#ff5e62 to #8a2387)
        const r = Math.round(255 * (1 - t) + 138 * t)
        const g = Math.round(94 * (1 - t) + 35 * t)
        const b = Math.round(98 * (1 - t) + 135 * t)

        // Center cute smiley icon highlight
        const cx = width / 2
        const cy = height / 2
        const centerDist = Math.hypot(x - cx, y - cy)
        if (centerDist < width * 0.28) {
          // White face center
          rawBytes[offset++] = 255
          rawBytes[offset++] = 250
          rawBytes[offset++] = 250
          rawBytes[offset++] = 255
        } else {
          rawBytes[offset++] = r
          rawBytes[offset++] = g
          rawBytes[offset++] = b
          rawBytes[offset++] = 255
        }
      }
    }
  }

  const compressed = zlib.deflateSync(rawBytes)
  const idatChunk = makeChunk('IDAT', compressed)
  const iendChunk = makeChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk])
}

const p192 = createPNG(192, 192)
fs.writeFileSync(path.resolve('public/icons/icon-192x192.png'), p192)

const p512 = createPNG(512, 512)
fs.writeFileSync(path.resolve('public/icons/icon-512x512.png'), p512)
fs.writeFileSync(path.resolve('public/apple-touch-icon.png'), p192)

console.log('Successfully generated icons for PWA!')
