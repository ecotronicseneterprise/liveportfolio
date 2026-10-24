// Zip-bomb probe for the DOCX path. Builds a minimal DOCX whose word/document.xml inflates to N MB of text
// but compresses to ~N/1000 MB (so it passes the 5 MB upload limit), then runs mammoth.extractRawText -
// exactly what lib/connectors/document.ts does - in a child with a capped heap and a wall-clock timeout.
//   node robustness-probe.cjs            (npm run probe:zipbomb)
const { spawnSync } = require('child_process')
const JSZip = require('jszip')

if (process.argv[2] === 'child') {
  const mb = Number(process.argv[3])
  ;(async () => {
    const zip = new JSZip()
    zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
    zip.file('_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
    const head = '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>'
    const tail = '</w:t></w:r></w:p></w:body></w:document>'
    zip.file('word/document.xml', head + 'A'.repeat(mb * 1024 * 1024) + tail)
    const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } })
    console.log('BUILT compressed KB', Math.round(buf.length / 1024), 'inflated MB', mb)
    const mammoth = require('mammoth')
    const t0 = Date.now()
    const r = await mammoth.extractRawText({ buffer: buf })
    console.log('RESULT extracted chars', r.value.length, 'ms', Date.now() - t0, 'rssMB', Math.round(process.memoryUsage().rss / 1048576))
  })().catch((e) => console.log('RESULT error', String(e.message).slice(0, 80)))
} else {
  for (const mb of [20, 100, 300]) {
    const r = spawnSync(process.execPath, ['--max-old-space-size=512', __filename, 'child', String(mb)], { encoding: 'utf8', timeout: 90000 })
    const out = (r.stdout || '').trim().split('\n').filter((l) => /^(BUILT|RESULT)/.test(l)).join(' | ')
    const status = r.error ? `TIMEOUT/ERR ${r.error.code}` : r.status === 0 ? 'exited 0' : `CRASHED exit ${r.status} ${(r.stderr || '').includes('heap out of memory') ? '(JS heap out of memory)' : (r.stderr || '').slice(0, 60)}`
    console.log(`${String(mb).padStart(4)} MB inflated: ${out || '(no output)'} → ${status}`)
  }
}
