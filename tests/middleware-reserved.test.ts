// Every top-level page folder must be reserved in middleware.ts, or /that-name is read as a portfolio slug ("Portfolio not found").
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('middleware reserved paths', () => {
  it('reserves every top-level route folder of the app', () => {
    const root = path.resolve(__dirname, '..')
    const source = fs.readFileSync(path.join(root, 'middleware.ts'), 'utf8')
    const dirs = fs.readdirSync(path.join(root, 'app'), { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('_') && !d.name.startsWith('('))
      .map((d) => d.name)
    const missing = dirs.filter((d) => !source.includes(`'${d}'`))
    expect(missing).toEqual([])
  })
})
