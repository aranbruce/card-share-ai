import { deflateSync, inflateSync } from "node:zlib"

/** An 8-bit RGBA image, row by row. */
export type RgbaImage = { width: number; height: number; data: Uint8Array }

const SIGNATURE = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
])

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  return pb <= pc ? b : c
}

/**
 * Decodes a non-interlaced 8-bit RGB or RGBA PNG (what Satori/resvg produce) into RGBA.
 * Other PNG flavours throw.
 */
export function decodePngRgba(png: Uint8Array): RgbaImage {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  if (!SIGNATURE.every((byte, i) => png[i] === byte)) {
    throw new Error("Not a PNG")
  }

  let width = 0
  let height = 0
  let channels = 0
  const idat: Uint8Array[] = []
  let offset = 8
  while (offset + 8 <= png.length) {
    const length = view.getUint32(offset)
    const type = String.fromCharCode(...png.subarray(offset + 4, offset + 8))
    const body = png.subarray(offset + 8, offset + 8 + length)
    if (type === "IHDR") {
      width = view.getUint32(offset + 8)
      height = view.getUint32(offset + 12)
      const bitDepth = body[8]
      const colorType = body[9]
      const interlace = body[12]
      if (
        bitDepth !== 8 ||
        interlace !== 0 ||
        (colorType !== 6 && colorType !== 2)
      ) {
        throw new Error("Unsupported PNG format")
      }
      channels = colorType === 6 ? 4 : 3
    } else if (type === "IDAT") {
      idat.push(body)
    } else if (type === "IEND") {
      break
    }
    offset += 12 + length
  }
  if (!width || !height || !channels) throw new Error("PNG has no header")

  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * channels
  const pixels = new Uint8Array(stride * height)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    const src = y * (stride + 1) + 1
    const dst = y * stride
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? pixels[dst + x - channels] : 0
      const up = y > 0 ? pixels[dst - stride + x] : 0
      const upLeft =
        y > 0 && x >= channels ? pixels[dst - stride + x - channels] : 0
      let value = raw[src + x]
      if (filter === 1) value += left
      else if (filter === 2) value += up
      else if (filter === 3) value += (left + up) >> 1
      else if (filter === 4) value += paeth(left, up, upLeft)
      pixels[dst + x] = value & 0xff
    }
  }

  if (channels === 4) return { width, height, data: pixels }
  const rgba = new Uint8Array(width * height * 4)
  for (let i = 0, j = 0; i < pixels.length; i += 3, j += 4) {
    rgba[j] = pixels[i]
    rgba[j + 1] = pixels[i + 1]
    rgba[j + 2] = pixels[i + 2]
    rgba[j + 3] = 255
  }
  return { width, height, data: rgba }
}

function chunk(type: string, body: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + body.length)
  const view = new DataView(out.buffer)
  view.setUint32(0, body.length)
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
  out.set(body, 8)
  view.setUint32(8 + body.length, crc32(out.subarray(4, 8 + body.length)))
  return out
}

/** Encodes RGBA pixels as a PNG. */
export function encodePngRgba({ width, height, data }: RgbaImage): Uint8Array {
  const header = new Uint8Array(13)
  const view = new DataView(header.buffer)
  view.setUint32(0, width)
  view.setUint32(4, height)
  header.set([8, 6, 0, 0, 0], 8)

  // Each row starts with its filter type; "up" (2) compresses smooth images well.
  const stride = width * 4
  const raw = new Uint8Array((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    const row = y * (stride + 1)
    raw[row] = 2
    for (let x = 0; x < stride; x++) {
      const up = y > 0 ? data[(y - 1) * stride + x] : 0
      raw[row + 1 + x] = (data[y * stride + x] - up) & 0xff
    }
  }

  return Buffer.concat([
    SIGNATURE,
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", new Uint8Array(0)),
  ])
}
