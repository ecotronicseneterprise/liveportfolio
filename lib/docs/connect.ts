// Per-assistant setup pages: two steps each, with a slot for a screenshot (shown as a labelled placeholder until real
// screenshots with invented data are added under public/docs/connect/).
import { MCP_URL } from '@/lib/mcp/docs'

export interface ConnectStep { title: string; body: string; image: string; alt: string }
export interface ConnectClient { slug: 'claude' | 'chatgpt' | 'other'; name: string; blurb: string; steps: ConnectStep[]; note?: string; command?: { label: string; text: string }[] }

const CLAUDE_LINK = `https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=LivePortfolio&connectorUrl=${encodeURIComponent(MCP_URL)}`
export const CLAUDE_ADD_LINK = CLAUDE_LINK

export const CONNECT_CLIENTS: ConnectClient[] = [
  {
    slug: 'claude', name: 'Claude', blurb: 'The quickest route: one button opens Claude with everything filled in.',
    steps: [
      { title: 'Add the connector', body: 'Press "Add to Claude" below. Claude opens with the name and address already filled in. Press Add.', image: 'claude-add.png', alt: 'Claude add custom connector dialog with LivePortfolio filled in' },
      { title: 'Connect and approve', body: 'Press Connect, sign in to LivePortfolio, choose what Claude may do, and approve. Then add the instruction at the top of this page to your custom instructions, so a new chat knows to use LivePortfolio.', image: 'claude-approve.png', alt: 'LivePortfolio consent screen' },
    ],
    note: 'Button not working? In Claude open Customize, then Connectors, then Add custom connector, and paste the address.',
  },
  {
    slug: 'chatgpt', name: 'ChatGPT', blurb: 'ChatGPT has no one-click button yet, so it takes two short steps.',
    steps: [
      { title: 'Add a custom connector', body: 'Open ChatGPT Settings, then Connectors (or Plugins). Choose Add custom connector, paste the address, and choose OAuth if asked.', image: 'chatgpt-add.png', alt: 'ChatGPT settings with the add custom connector option' },
      { title: 'Connect and approve', body: 'Press Connect, sign in to LivePortfolio, choose what ChatGPT may do, and approve. Then add the instruction at the top of this page to your custom instructions, so a new chat knows to use LivePortfolio.', image: 'chatgpt-approve.png', alt: 'LivePortfolio consent screen' },
    ],
    note: 'If you do not see the option, your ChatGPT plan or workspace may not allow custom connectors yet. Claude works on more plans.',
  },
  {
    slug: 'other', name: 'Other assistants', blurb: 'Claude Code, Gemini CLI, Cursor and VS Code.',
    steps: [
      { title: 'Add the address', body: 'Run the command for your tool, or paste the address into its MCP settings (type: HTTP).', image: 'other-add.png', alt: 'Terminal with the add command' },
      { title: 'Sign in and approve', body: 'Your tool opens a browser window: sign in to LivePortfolio, choose what it may do, and approve.', image: 'other-approve.png', alt: 'LivePortfolio consent screen' },
    ],
    command: [
      { label: 'Claude Code', text: `claude mcp add --transport http liveportfolio ${MCP_URL}` },
      { label: 'Gemini CLI', text: `gemini mcp add --scope user --transport http liveportfolio ${MCP_URL}` },
    ],
    note: 'The Gemini app itself is not supported yet.',
  },
]

export { SYNC_INSTRUCTION, SYNC_NOTE } from './sync'

export const clientBySlug = (s: string) => CONNECT_CLIENTS.find((c) => c.slug === s)
