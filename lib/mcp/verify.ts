// How the consent screen describes the app asking to connect. Client registration is open (any MCP client can register itself), so a
// malicious app could call itself "ChatGPT". The badge is decided from the redirect address the sign-in will return to, never from
// the name the app gave itself.
export type AppTrust =
  | { level: 'verified'; label: string }
  | { level: 'local'; label: string }
  | { level: 'unverified'; label: string; warning: string }

const VERIFIED: Record<string, string> = { 'chatgpt.com': 'ChatGPT', 'claude.ai': 'Claude' }
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])
const VENDOR_NAMES = /chatgpt|openai|claude|anthropic|gemini|google|cursor|vs ?code|copilot|perplexity|mistral/i

export function appTrust(redirectUri: string, clientName: string): AppTrust {
  let host = ''
  let protocol = ''
  try { const u = new URL(redirectUri); host = u.hostname.toLowerCase(); protocol = u.protocol } catch { /* unverified below */ }
  if (protocol === 'https:' && VERIFIED[host]) return { level: 'verified', label: `Verified: ${host}` }
  if (LOOPBACK.has(host) && (protocol === 'http:' || protocol === 'https:')) return { level: 'local', label: 'Runs on your own computer' }
  const claims = VENDOR_NAMES.test(clientName)
  return {
    level: 'unverified',
    label: 'Unverified app',
    warning: claims
      ? `This app calls itself "${clientName}" but it is not coming from a known ${clientName} address${host ? ` (it returns to ${host})` : ''}. Only continue if you started this connection yourself and trust it.`
      : `We could not verify this app${host ? ` (it returns to ${host})` : ''}. Only continue if you started this connection yourself and trust it.`,
  }
}
