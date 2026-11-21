// Public documentation content for the assistant connection. Generated from the tool registry, so it cannot describe a tool that
// does not exist (tests/mcp-docs.test.ts also checks llms.txt and the server card against it).
import { TOOLS } from './tools'

export const MCP_URL = `${(process.env.NEXT_PUBLIC_APP_URL || 'https://liveportfolio.site').replace(/\/$/, '')}/mcp`

export const KIND_LABEL = {
  read: 'Reads only. Changes nothing.',
  direct: 'Saved at once as a version you can undo.',
  approval: 'Needs your approval on liveportfolio.site before anything changes.',
} as const

export const CANNOT = [
  'Publish or unpublish your portfolio',
  'Change your address (the part before .liveportfolio.site) or custom domain',
  'Change your plan, payment details or anything about billing',
  'Delete your portfolio or your account',
  'Change your sign-in email or password',
  'Read or change anyone else\'s portfolio',
]

export const CONNECT_STEPS = {
  claude: [
    'Open Claude, then Customize, then Connectors, then Add custom connector.',
    `Enter the address ${MCP_URL} and save.`,
    'Choose Connect. Sign in to LivePortfolio if asked, choose what the app may do, and approve.',
    'Ask Claude: "Read my LivePortfolio portfolio and tell me what to improve."',
  ],
  chatgpt: [
    'In ChatGPT, open Settings, then Connectors (Apps), and turn on developer mode if your workspace requires it.',
    `Add a custom connector with the address ${MCP_URL}.`,
    'Choose Connect, sign in to LivePortfolio, choose what the app may do, and approve.',
    'Ask ChatGPT: "Use LivePortfolio to read my portfolio and suggest improvements."',
  ],
  claudeCode: [`Run: claude mcp add --transport http liveportfolio ${MCP_URL}`, 'Run /mcp inside Claude Code and choose Authenticate for liveportfolio.', 'Sign in and approve in the browser window that opens.'],
}

export const EXAMPLES = [
  'Tighten my About section. Keep every fact.',
  'Add this job to my experience: (paste the text).',
  'Turn this README into a project: (paste the README).',
  'Fix the typos in my portfolio.',
  'Switch my portfolio to the Developer design.',
  'Use this screenshot for project 2. (The assistant will give you a private upload link.)',
  'Undo that last change.',
]

export function toolsReference() {
  return TOOLS.map((t) => ({
    name: t.name,
    title: t.title,
    kind: t.kind,
    kindLabel: KIND_LABEL[t.kind],
    description: t.description,
    readOnly: t.annotations.readOnlyHint,
    destructive: t.annotations.destructiveHint,
    openWorld: t.annotations.openWorldHint,
  }))
}

export function llmsTxt(): string {
  const origin = MCP_URL.replace(/\/mcp$/, '')
  return [
    '# LivePortfolio',
    '',
    '> LivePortfolio builds a professional portfolio website from a CV or a few details. Your own AI assistant (Claude, ChatGPT, Claude Code) can edit your portfolio for you through a documented MCP server.',
    '',
    `MCP server (Streamable HTTP, OAuth 2.1 with PKCE): ${MCP_URL}`,
    `Protected-resource metadata: ${origin}/.well-known/oauth-protected-resource`,
    '',
    '## Documentation',
    `- [Connect your AI assistant](${origin}/docs/mcp): setup for Claude, ChatGPT and Claude Code, what the assistant can and cannot do, every tool`,
    `- [All docs](${origin}/docs)`,
    '',
    '## What the assistant can do',
    ...TOOLS.map((t) => `- ${t.name}: ${t.title}`),
    '',
    '## What it can never do',
    ...CANNOT.map((c) => `- ${c}`),
    '',
    '## Guides for people',
    `- [Portfolio for your profession](${origin}/portfolio-for)`,
    `- [Free portfolio website](${origin}/free-portfolio-website)`,
    `- [CV to portfolio](${origin}/cv-to-portfolio)`,
    '',
  ].join('\n')
}

export function serverCard() {
  return {
    name: 'liveportfolio',
    title: 'LivePortfolio',
    description: 'Read and edit your LivePortfolio portfolio from your AI assistant. Edits are saved as undoable versions; removals, new links and whole-list replacements need your approval on the website. Requires a Pro account.',
    url: MCP_URL,
    transport: 'streamable-http',
    protocolVersions: ['2025-11-25', '2025-06-18', '2025-03-26'],
    authorization: { type: 'oauth2.1', pkce: 'S256', resourceMetadata: `${MCP_URL.replace(/\/mcp$/, '')}/.well-known/oauth-protected-resource` },
    documentation: `${MCP_URL}`.replace(/\/mcp$/, '/docs/mcp'),
    tools: TOOLS.map((t) => ({ name: t.name, title: t.title, readOnly: t.annotations.readOnlyHint })),
  }
}
