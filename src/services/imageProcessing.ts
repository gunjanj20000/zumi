/**
 * Image processing, resizing, compression and Object URL management.
 */

const MAX_IMAGE_DIMENSION = 1024
const COMPRESSION_QUALITY = 0.85

/**
 * Resizes and compresses an image File or Blob to max 1024x1024 WebP/JPEG.
 */
export async function processAndCompressImage(file: Blob | File): Promise<{ blob: Blob; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      let { width, height } = img

      // Scale down if either dimension exceeds max
      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_IMAGE_DIMENSION) / width)
          width = MAX_IMAGE_DIMENSION
        } else {
          width = Math.round((width * MAX_IMAGE_DIMENSION) / height)
          height = MAX_IMAGE_DIMENSION
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, width)
      canvas.height = Math.max(1, height)

      const ctx = canvas.getContext('2d', { alpha: true })
      if (!ctx) {
        reject(new Error('Failed to create canvas 2D context'))
        return
      }

      // Draw image
      ctx.drawImage(img, 0, 0, width, height)

      // Try WebP first, fallback to JPEG
      canvas.toBlob(
        (webpBlob) => {
          if (webpBlob && webpBlob.size > 0) {
            resolve({ blob: webpBlob, mimeType: 'image/webp' })
          } else {
            // Fallback to JPEG
            canvas.toBlob(
              (jpegBlob) => {
                if (jpegBlob) {
                  resolve({ blob: jpegBlob, mimeType: 'image/jpeg' })
                } else {
                  // Fallback to original blob
                  resolve({ blob: file, mimeType: file.type || 'image/jpeg' })
                }
              },
              'image/jpeg',
              COMPRESSION_QUALITY
            )
          }
        },
        'image/webp',
        COMPRESSION_QUALITY
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image for processing'))
    }

    img.src = url
  })
}

/**
 * Creates an object URL from a Blob with memory tracking.
 */
export function createImageUrl(blob: Blob): string {
  return URL.createObjectURL(blob)
}

/**
 * Revokes an object URL to release memory.
 */
export function revokeImageUrl(url: string | null | undefined): void {
  if (url && url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url)
    } catch {
      // ignore
    }
  }
}

/**
 * Creates high-quality child-friendly vector illustration blobs for starter kit objects.
 */
export function createVectorIllustrationBlob(type: 'apple' | 'bhujia' | 'chocolate' | 'ball' | 'milk'): Blob {
  let svg = ''

  switch (type) {
    case 'apple':
      svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
        <defs>
          <radialGradient id="appleGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stop-color="#ff4d4d"/>
            <stop offset="60%" stop-color="#dc2626"/>
            <stop offset="100%" stop-color="#991b1b"/>
          </radialGradient>
          <radialGradient id="leafGrad" cx="40%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#4ade80"/>
            <stop offset="100%" stop-color="#16a34a"/>
          </radialGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="24" stdDeviation="20" flood-color="#7f1d1d" flood-opacity="0.25"/>
          </filter>
        </defs>
        <ellipse cx="300" cy="530" rx="200" ry="24" fill="#000000" opacity="0.08"/>
        <!-- Apple Stem -->
        <path d="M 300 170 C 310 110 350 90 380 80" stroke="#78350f" stroke-width="20" stroke-linecap="round" fill="none"/>
        <!-- Apple Leaf -->
        <path d="M 315 130 C 370 80 430 110 430 110 C 430 110 400 160 330 150 Z" fill="url(#leafGrad)"/>
        <!-- Main Apple Body -->
        <g filter="url(#shadow)">
          <path d="M 300 200 C 240 130 130 150 130 290 C 130 430 230 510 300 510 C 370 510 470 430 470 290 C 470 150 360 130 300 200 Z" fill="url(#appleGrad)"/>
        </g>
        <!-- Apple Highlight -->
        <ellipse cx="210" cy="240" rx="45" ry="70" transform="rotate(-30 210 240)" fill="#ffffff" opacity="0.32"/>
        <circle cx="250" cy="210" r="14" fill="#ffffff" opacity="0.4"/>
      </svg>`
      break

    case 'bhujia':
      svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
        <defs>
          <linearGradient id="bowlGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#38bdf8"/>
            <stop offset="100%" stop-color="#0284c7"/>
          </linearGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="24" stdDeviation="20" flood-color="#0f172a" flood-opacity="0.2"/>
          </filter>
        </defs>
        <ellipse cx="300" cy="530" rx="220" ry="24" fill="#000000" opacity="0.08"/>
        <!-- Bowl -->
        <g filter="url(#shadow)">
          <ellipse cx="300" cy="360" rx="230" ry="70" fill="#e0f2fe"/>
          <path d="M 70 360 C 90 500 210 520 300 520 C 390 520 510 500 530 360 Z" fill="url(#bowlGrad)"/>
        </g>
        <!-- Crispy Sev / Bhujia Strands -->
        <g stroke="#f59e0b" stroke-width="12" stroke-linecap="round" fill="none">
          <path d="M 160 340 Q 210 260 280 320 T 380 280"/>
          <path d="M 190 320 Q 260 240 330 310 T 430 260" stroke="#fbbf24"/>
          <path d="M 230 300 Q 290 220 370 290 T 460 320" stroke="#fcd34d"/>
          <path d="M 140 350 Q 230 290 300 340 T 410 320" stroke="#d97706"/>
          <path d="M 220 280 Q 290 200 340 270 T 420 250" stroke="#fbbf24"/>
          <path d="M 180 310 Q 230 230 320 280 T 390 240"/>
          <path d="M 270 250 Q 320 180 370 240 T 440 280" stroke="#fcd34d"/>
          <path d="M 160 355 Q 260 310 340 360 T 450 330" stroke="#b45309"/>
          <path d="M 250 240 Q 300 160 360 220" stroke="#f59e0b" stroke-width="14"/>
        </g>
        <!-- Bowl Rim Highlight -->
        <ellipse cx="300" cy="360" rx="226" ry="66" fill="none" stroke="#bae6fd" stroke-width="6"/>
      </svg>`
      break

    case 'chocolate':
      svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
        <defs>
          <linearGradient id="chocGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#78350f"/>
            <stop offset="50%" stop-color="#451a03"/>
            <stop offset="100%" stop-color="#290e02"/>
          </linearGradient>
          <linearGradient id="wrapGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#f43f5e"/>
            <stop offset="50%" stop-color="#fb7185"/>
            <stop offset="100%" stop-color="#e11d48"/>
          </linearGradient>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fef08a"/>
            <stop offset="100%" stop-color="#f59e0b"/>
          </linearGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="24" stdDeviation="20" flood-color="#1e0a02" flood-opacity="0.3"/>
          </filter>
        </defs>
        <ellipse cx="300" cy="530" rx="200" ry="24" fill="#000000" opacity="0.08"/>
        <!-- Main Chocolate Bar -->
        <g filter="url(#shadow)" transform="rotate(-12 300 300)">
          <rect x="170" y="100" width="260" height="380" rx="20" fill="url(#chocGrad)"/>
          <!-- Chocolate segments -->
          <rect x="190" y="120" width="105" height="75" rx="10" fill="#5c2409" stroke="#92400e" stroke-width="3"/>
          <rect x="305" y="120" width="105" height="75" rx="10" fill="#5c2409" stroke="#92400e" stroke-width="3"/>
          <rect x="190" y="205" width="105" height="75" rx="10" fill="#5c2409" stroke="#92400e" stroke-width="3"/>
          <rect x="305" y="205" width="105" height="75" rx="10" fill="#5c2409" stroke="#92400e" stroke-width="3"/>
          <!-- Silver/Gold Foil wrap -->
          <path d="M 160 270 L 440 250 L 440 310 L 160 320 Z" fill="url(#goldGrad)"/>
          <!-- Red Wrapper -->
          <rect x="160" y="300" width="280" height="190" rx="12" fill="url(#wrapGrad)"/>
          <text x="300" y="390" font-family="sans-serif" font-weight="900" font-size="28" fill="#ffffff" text-anchor="middle" letter-spacing="4">SWEET</text>
        </g>
      </svg>`
      break

    case 'ball':
      svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
        <defs>
          <radialGradient id="ballGrad" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#60a5fa"/>
            <stop offset="60%" stop-color="#2563eb"/>
            <stop offset="100%" stop-color="#1e3a8a"/>
          </radialGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="24" stdDeviation="20" flood-color="#1e3a8a" flood-opacity="0.3"/>
          </filter>
        </defs>
        <ellipse cx="300" cy="520" rx="190" ry="24" fill="#000000" opacity="0.08"/>
        <!-- Ball Sphere -->
        <g filter="url(#shadow)">
          <circle cx="300" cy="300" r="190" fill="url(#ballGrad)"/>
          <!-- Colorful Beach Ball stripes -->
          <path d="M 300 110 C 220 200 220 400 300 490 C 260 410 260 190 300 110 Z" fill="#ef4444"/>
          <path d="M 300 110 C 380 200 380 400 300 490 C 340 410 340 190 300 110 Z" fill="#facc15"/>
          <!-- Star Accent -->
          <circle cx="210" cy="270" r="14" fill="#ffffff" opacity="0.8"/>
          <!-- Shine highlight -->
          <ellipse cx="240" cy="190" rx="50" ry="25" transform="rotate(-35 240 190)" fill="#ffffff" opacity="0.45"/>
        </g>
      </svg>`
      break

    case 'milk':
      svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
        <defs>
          <linearGradient id="cartonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#f8fafc"/>
            <stop offset="60%" stop-color="#ffffff"/>
            <stop offset="100%" stop-color="#e2e8f0"/>
          </linearGradient>
          <linearGradient id="blueAccent" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#38bdf8"/>
            <stop offset="100%" stop-color="#0284c7"/>
          </linearGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="24" stdDeviation="20" flood-color="#0f172a" flood-opacity="0.2"/>
          </filter>
        </defs>
        <ellipse cx="300" cy="530" rx="180" ry="24" fill="#000000" opacity="0.08"/>
        <!-- Milk Carton -->
        <g filter="url(#shadow)">
          <!-- Top Gable Roof -->
          <polygon points="210,180 300,100 390,180" fill="#bae6fd"/>
          <polygon points="300,100 390,180 390,130 300,70" fill="#0284c7"/>
          <!-- Carton Body -->
          <rect x="210" y="180" width="180" height="320" rx="16" fill="url(#cartonGrad)"/>
          <!-- Blue Wave Pattern -->
          <path d="M 210 320 Q 255 350 300 320 T 390 320 L 390 500 L 210 500 Z" fill="url(#blueAccent)"/>
          <!-- Cute Cow spot / milk droplet -->
          <path d="M 300 230 C 275 270 270 290 300 300 C 330 290 325 270 300 230 Z" fill="#38bdf8"/>
          <!-- Text -->
          <text x="300" y="420" font-family="sans-serif" font-weight="900" font-size="36" fill="#ffffff" text-anchor="middle" letter-spacing="3">MILK</text>
        </g>
      </svg>`
      break
  }

  return new Blob([svg], { type: 'image/svg+xml' })
}
