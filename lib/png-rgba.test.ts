import { deflateSync } from "node:zlib"
import { describe, expect, it } from "vitest"
import { decodePngRgba, encodePngRgba } from "./png-rgba"

describe("png rgba", () => {
  it("round-trips pixels", () => {
    const width = 5
    const height = 4
    const data = new Uint8Array(width * height * 4).map(
      (_, i) => (i * 37) % 256,
    )
    const decoded = decodePngRgba(encodePngRgba({ width, height, data }))
    expect(decoded.width).toBe(width)
    expect(decoded.height).toBe(height)
    expect(Array.from(decoded.data)).toEqual(Array.from(data))
  })

  it("decodes every row filter", () => {
    // 2×5 RGB image, one row per filter type (0-4), built by hand.
    const width = 2
    const rows = [0, 1, 2, 3, 4]
    const pixels = rows.map((r) => [
      [10 * r, 20, 30],
      [40, 50 + r, 60],
    ])
    const raw: number[] = []
    const prev = (y: number, x: number, c: number) =>
      y > 0 ? pixels[y - 1][x][c] : 0
    rows.forEach((filter, y) => {
      raw.push(filter)
      for (let x = 0; x < width; x++) {
        for (let c = 0; c < 3; c++) {
          const v = pixels[y][x][c]
          const a = x > 0 ? pixels[y][x - 1][c] : 0
          const b = prev(y, x, c)
          const cc = x > 0 ? prev(y, x - 1, c) : 0
          const p = a + b - cc
          const pa = Math.abs(p - a)
          const pb = Math.abs(p - b)
          const pc = Math.abs(p - cc)
          const paeth = pa <= pb && pa <= pc ? a : pb <= pc ? b : cc
          const predict = [0, a, b, (a + b) >> 1, paeth][filter]
          raw.push((v - predict) & 0xff)
        }
      }
    })
    const chunk = (type: string, body: Uint8Array) => {
      const out = Buffer.alloc(12 + body.length)
      out.writeUInt32BE(body.length, 0)
      out.write(type, 4, "ascii")
      Buffer.from(body).copy(out, 8)
      return out // CRC is not checked by the decoder
    }
    const header = Buffer.alloc(13)
    header.writeUInt32BE(width, 0)
    header.writeUInt32BE(rows.length, 4)
    header.set([8, 2, 0, 0, 0], 8)
    const png = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", header),
      chunk("IDAT", deflateSync(Uint8Array.from(raw))),
      chunk("IEND", new Uint8Array(0)),
    ])
    const { data } = decodePngRgba(png)
    const expected = pixels.flatMap((row) => row.flatMap((px) => [...px, 255]))
    expect(Array.from(data)).toEqual(expected)
  })

  it("rejects non-PNG data", () => {
    expect(() =>
      decodePngRgba(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])),
    ).toThrow()
  })
})
