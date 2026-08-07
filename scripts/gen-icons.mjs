// Generate PWA icons from public/favicon.svg (ledger-sheet mark) using sharp.
// any: 192/256/384/512 exact render on the pine-green brand bg.
// maskable: 512 with ~20% safe-zone padding so the mark survives round masks.
import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = resolve(root, 'public/favicon.svg')
const outDir = resolve(root, 'public/icons')
const BG = '#0f5132' // --oz-accent / --lg-green

await mkdir(outDir, { recursive: true })

for (const size of [192, 256, 384, 512]) {
  await sharp(src, { density: 512 })
    .resize(size, size, { fit: 'contain', background: BG })
    .png()
    .toFile(resolve(outDir, `icon-${size}.png`))
}

// Maskable: render mark at 60% then center on 512 brand canvas (safe zone).
const inner = Math.round(512 * 0.6)
const markPng = await sharp(src, { density: 512 })
  .resize(inner, inner, { fit: 'contain', background: BG })
  .png()
  .toBuffer()
await sharp({ create: { width: 512, height: 512, channels: 4, background: BG } })
  .composite([{ input: markPng, gravity: 'center' }])
  .png()
  .toFile(resolve(outDir, 'maskable-512.png'))
