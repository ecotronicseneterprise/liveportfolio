// Tiny message lookup over messages/en.json. A stand-in with the same call shape as next-intl's t('ns.key', vars) so the
// pages can move to next-intl (cookie locale, no URL prefix) without touching their text. English only for now.
import en from '@/messages/en.json'

type Tree = { [k: string]: string | Tree }

export function t(key: string, vars: Record<string, string | number> = {}): string {
  let node: string | Tree | undefined = en as Tree
  for (const part of key.split('.')) node = typeof node === 'object' ? node[part] : undefined
  const text = typeof node === 'string' ? node : key
  return text.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`))
}
