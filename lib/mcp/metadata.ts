// RFC 9728 protected-resource metadata for the MCP endpoint.
export function protectedResourceMetadata() {
  const origin = (process.env.NEXT_PUBLIC_APP_URL || 'https://liveportfolio.site').replace(/\/$/, '')
  return {
    resource: `${origin}/mcp`,
    authorization_servers: [`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1`],
    bearer_methods_supported: ['header'],
    resource_name: 'LivePortfolio',
    resource_documentation: `${origin}/docs/mcp`,
  }
}
