// Who may use the assistant connection. Off unless MCP_ENABLED=true. With MCP_ALLOWED_EMAILS set (comma separated) ONLY those
// accounts may connect (the testing phase); with it empty, any Pro account may (launch).
export type Access = 'ok' | 'disabled' | 'not_allowed' | 'needs_pro'

export function mcpAccess(env: Record<string, string | undefined>, email: string | null, plan: 'free' | 'basic' | 'pro'): Access {
  if (env.MCP_ENABLED !== 'true') return 'disabled'
  const allow = (env.MCP_ALLOWED_EMAILS ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
  if (allow.length) return email && allow.includes(email.toLowerCase()) ? 'ok' : 'not_allowed'
  return plan === 'pro' ? 'ok' : 'needs_pro'
}

export const ACCESS_MESSAGE: Record<Exclude<Access, 'ok'>, string> = {
  disabled: 'The assistant connection is not switched on yet.',
  not_allowed: 'The assistant connection is not available for this account yet.',
  needs_pro: 'The assistant connection is included with the Pro plan.',
}
