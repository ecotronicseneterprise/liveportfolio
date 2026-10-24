// Coordinate-based PDF text extraction (pdfjs-dist). Bench-only: nothing here ships in the app.
//
// Why: pdf-parse emits text in content-stream order, which for sidebar/two-column CVs interleaves
// the columns line by line. This reads a detected column fully before the next, and keeps table
// rows together as "cell | cell | cell".
//
// Heuristic per page:
//  1. items → rows (same baseline ±2.5pt) → cells (gap > 14pt starts a new cell)
//  2. ignore the top 15% band when looking for a gutter (full-width headers / photo bands)
//  3. gutter = zero-coverage x-band ≥ 12pt wide inside 25–75% of the page width
//  4. if left/right rows share baselines (≥60%) it is a TABLE → read row by row
//     else it is COLUMNS → header band, then left column, then right column

const NL = String.fromCharCode(10)
interface Item { str: string; x: number; y: number; w: number }
interface Cell { text: string; x0: number; x1: number; y: number }

export async function layoutText(data: Buffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const doc = await pdfjs.getDocument({ data: new Uint8Array(data), useSystemFonts: true, verbosity: 0 }).promise
  const pages: string[] = []
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const [x0, y0, x1, y1] = page.view
    const tc = await page.getTextContent()
    const items: Item[] = []
    for (const it of tc.items as Array<{ str?: string; transform: number[]; width: number }>) {
      if (it.str && it.str.trim()) items.push({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width })
    }
    pages.push(pageText(items, x1 - x0, y1 - y0))
  }
  await (doc as { destroy?: () => Promise<void> }).destroy?.()
  return pages.join('\n\n')
}

function toCells(items: Item[]): Cell[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x)
  const rows: Item[][] = []
  for (const it of sorted) {
    const last = rows[rows.length - 1]
    if (last && Math.abs(last[0].y - it.y) <= 2.5) last.push(it)
    else rows.push([it])
  }
  const cells: Cell[] = []
  for (const row of rows) {
    row.sort((a, b) => a.x - b.x)
    let cur: Cell | null = null
    for (const it of row) {
      if (cur && it.x - cur.x1 <= 14) {
        cur.text += (it.x - cur.x1 > 1.5 ? ' ' : '') + it.str
        cur.x1 = it.x + it.w
      } else {
        if (cur) cells.push(cur)
        cur = { text: it.str, x0: it.x, x1: it.x + it.w, y: row[0].y }
      }
    }
    if (cur) cells.push(cur)
  }
  return cells
}

function rowsOf(cells: Cell[]): Cell[][] {
  const sorted = [...cells].sort((a, b) => b.y - a.y || a.x0 - b.x0)
  const rows: Cell[][] = []
  for (const c of sorted) {
    const last = rows[rows.length - 1]
    if (last && Math.abs(last[0].y - c.y) <= 2.5) last.push(c)
    else rows.push([c])
  }
  return rows
}

const rowString = (r: Cell[]) => r.sort((a, b) => a.x0 - b.x0).map((c) => c.text).join(' | ')

function pageText(items: Item[], pageW: number, _pageH: number): string {
  if (!items.length) return ''
  const cells = toCells(items)
  const plain = () => rowsOf(cells).map(rowString).join(NL)

  // coverage histogram (5pt bins); very wide cells (headings/rules) are ignored for gutter search
  const bin = 5
  const cov = new Array(Math.ceil(pageW / bin)).fill(0)
  for (const c of cells) {
    if (c.x1 - c.x0 > pageW * 0.4) continue
    for (let b = Math.floor(c.x0 / bin); b <= Math.floor(c.x1 / bin); b++) if (b >= 0 && b < cov.length) cov[b]++
  }
  const lo = Math.floor((pageW * 0.25) / bin)
  const hi = Math.floor((pageW * 0.75) / bin)
  let best = { start: -1, len: 0 }
  for (let b = lo; b <= hi; ) {
    if (cov[b] === 0) {
      let e = b
      while (e <= hi && cov[e] === 0) e++
      if (e - b > best.len) best = { start: b, len: e - b }
      b = e
    } else b++
  }
  if (best.len * bin < 12) return plain()

  const gutter = (best.start + best.len / 2) * bin
  const crossing = cells.filter((c) => c.x0 < gutter && c.x1 > gutter)
  const left = cells.filter((c) => c.x1 <= gutter)
  const right = cells.filter((c) => c.x0 >= gutter)
  if (left.length < 4 || right.length < 4) return plain()

  const ly = rowsOf(left).map((r) => r[0].y)
  const ry = rowsOf(right).map((r) => r[0].y)
  const aligned = ly.filter((y) => ry.some((z) => Math.abs(z - y) <= 2.5)).length / Math.min(ly.length, ry.length)
  if (process.env.LAYOUT_DEBUG) console.log('aligned', aligned.toFixed(2), 'left', ly.length, 'right', ry.length)
  if (aligned >= 0.8) return plain() // table: keep rows together

  const topY = Math.max(ly[0], ry[0])
  const out: string[] = []
  const above = crossing.filter((c) => c.y > topY)
  if (above.length) out.push(rowsOf(above).map(rowString).join(NL))
  out.push(rowsOf(left).map(rowString).join(NL))
  out.push(rowsOf(right).map(rowString).join(NL))
  const below = crossing.filter((c) => c.y <= topY)
  if (below.length) out.push(rowsOf(below).map(rowString).join(NL))
  return out.join(NL)
}
