// Per-assistant setup guides. Claude and ChatGPT share one structure (three steps) and one component (components/docs/ConnectGuide.tsx)
// so they cannot drift apart. Screenshots live in public/connect/ and are shown when the file exists, else a labelled placeholder.
import { MCP_URL } from '@/lib/mcp/docs'

export interface GuideField { label: string; value: string; copy?: boolean }
export interface GuideImage { file: string; alt: string }
export interface GuideStep { title: string; paragraphs: string[]; fields?: GuideField[]; note?: string; image: GuideImage; details?: { summary: string; text: string; image: GuideImage } }
export interface ConnectClient {
  slug: 'claude' | 'chatgpt' | 'other'
  name: string
  blurb: string
  steps: GuideStep[]
  /** shown as one-click button above the steps */
  oneClick?: boolean
  commands?: { label: string; text: string }[]
  note?: string
}

const CLAUDE_LINK = `https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=LivePortfolio&connectorUrl=${encodeURIComponent(MCP_URL)}`
export const CLAUDE_ADD_LINK = CLAUDE_LINK

const APPROVE = 'Sign in to LivePortfolio, then press Connect. Keep Allow edits on if you want the assistant to make changes. Leave "Share my email, phone and WhatsApp" off unless you need it.'

export const CONNECT_CLIENTS: ConnectClient[] = [
  {
    slug: 'claude', name: 'Claude', oneClick: true,
    blurb: 'Three short steps, or press the button for a head start.',
    steps: [
      {
        title: 'Open Plugins',
        paragraphs: ['Click Plugins in the left sidebar, then Add, then Add custom connector.', 'Don\'t see it? Go to Settings, then Plugins.'],
        image: { file: 'claude-step1-add-custom-connector.png', alt: 'Claude Plugins page with the Add menu open on Add custom connector' },
      },
      {
        title: 'Paste and continue',
        paragraphs: ['Paste these two details, then click Continue.', 'If you see an "OAuth client" screen, leave "Register automatically" selected and click Add.'],
        fields: [{ label: 'Name', value: 'LivePortfolio', copy: true }, { label: 'Address', value: MCP_URL, copy: true }],
        note: 'Claude shows a trust notice for every custom connector.',
        image: { file: 'claude-step2-paste-address.png', alt: 'Claude add custom connector dialog with the name and address filled in' },
        details: { summary: 'Seeing the "OAuth client" screen?', text: 'Leave "Register automatically" selected and click Add.', image: { file: 'claude-oauth-register-automatically.png', alt: 'Claude OAuth client screen with Register automatically selected' } },
      },
      {
        title: 'Approve',
        paragraphs: [APPROVE],
        image: { file: 'claude-step3-approve.png', alt: 'LivePortfolio consent screen showing Verified: claude.ai' },
      },
    ],
  },
  {
    slug: 'chatgpt', name: 'ChatGPT',
    blurb: 'ChatGPT has no one-click button yet. It takes three short steps.',
    steps: [
      {
        title: 'Open Plugins',
        paragraphs: ['Click Plugins in the left sidebar, then Add, then Add custom MCP server.', 'Don\'t see Plugins? Go to Settings, then Plugins, then Browse all plugins.'],
        image: { file: 'chatgpt-step1-add-custom-mcp.png', alt: 'ChatGPT Plugins page with the Add menu open on Add custom MCP server' },
      },
      {
        title: 'Paste these details',
        paragraphs: ['Fill in the form with these four details. Authentication is already set to OAuth and you do not need Advanced settings.', 'Then tick "I understand and want to continue" and click Create as a plugin.'],
        fields: [
          { label: 'Name', value: 'LivePortfolio', copy: true },
          { label: 'Description', value: 'My LivePortfolio', copy: true },
          { label: 'Server URL', value: MCP_URL, copy: true },
          { label: 'Authentication', value: 'OAuth', copy: true },
        ],
        note: 'ChatGPT shows this notice for every custom connection.',
        image: { file: 'chatgpt-step2-fill-form.png', alt: 'ChatGPT new plugin form with name, description and server URL filled in' },
      },
      {
        title: 'Continue and approve',
        paragraphs: ['Click Continue to LivePortfolio, then:', APPROVE],
        image: { file: 'chatgpt-step3-approve.png', alt: 'LivePortfolio consent screen showing Verified: chatgpt.com' },
      },
    ],
    note: 'If you do not see the option, your ChatGPT plan or workspace may not offer custom connections. Claude is a good alternative.',
  },
  {
    slug: 'other', name: 'Other assistants',
    blurb: 'Claude Code, Gemini CLI, Cursor and VS Code.',
    commands: [
      { label: 'Claude Code', text: `claude mcp add --transport http liveportfolio ${MCP_URL}` },
      { label: 'Gemini CLI', text: `gemini mcp add --scope user --transport http liveportfolio ${MCP_URL}` },
    ],
    steps: [
      { title: 'Add the address', paragraphs: ['Run the command for your tool, or paste the address into its MCP settings (type: HTTP).'], fields: [{ label: 'Address', value: MCP_URL, copy: true }], image: { file: 'other-add.png', alt: 'Terminal with the add command' } },
      { title: 'Sign in and approve', paragraphs: ['Your tool opens a browser window.', APPROVE], image: { file: 'other-approve.png', alt: 'LivePortfolio consent screen' } },
    ],
    note: 'The Gemini app itself is not supported yet.',
  },
]

export { FIRST_CHAT_MESSAGE, FIRST_CHAT_NOTE, SYNC_INSTRUCTION, SYNC_NOTE } from './sync'

export const clientBySlug = (s: string) => CONNECT_CLIENTS.find((c) => c.slug === s)
