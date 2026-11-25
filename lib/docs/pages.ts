// User documentation, in the repo so it ships with the code and cannot drift from it. Every statement here was checked against the
// app (plans in lib/plans.ts, the assistant in lib/mcp). Do not add a claim the product does not back. No prices here: pricing lives on the home page.
import { SUPPORT_EMAIL } from '@/lib/brand'
import { CANNOT, CONNECT_STEPS, EXAMPLES, MCP_URL } from '@/lib/mcp/docs'
import { FIRST_CHAT_MESSAGE, FIRST_CHAT_NOTE } from '@/lib/docs/sync'

export type Block =
  | { t: 'p'; text: string }
  | { t: 'h'; text: string }
  | { t: 'ul'; items: string[] }
  | { t: 'ol'; items: string[] }
  | { t: 'code'; text: string }
  | { t: 'note'; text: string }

export interface DocPage { slug: string; group: 'Start' | 'AI assistant' | 'Portfolio' | 'Account' | 'Help'; title: string; description: string; blocks: Block[] }

export const DOC_PAGES: DocPage[] = [
  {
    slug: 'quickstart', group: 'Start', title: 'Quickstart', description: 'Build, preview and publish your portfolio.',
    blocks: [
      { t: 'ol', items: [
        'Create an account with your email or Google at liveportfolio.site.',
        'Upload your CV, import from GitHub, or type a few details. Your portfolio is written for you.',
        'Preview it privately. Switch between designs and edit any text; nothing is public yet.',
        'Publish when you are happy. It goes live at yourname.liveportfolio.site, ready to share on LinkedIn, WhatsApp or in applications.',
      ] },
      { t: 'note', text: 'Free accounts can build and preview privately. Publishing needs a paid plan; see the plans on the home page.' },
    ],
  },
  {
    slug: 'connect', group: 'AI assistant', title: 'Connect your AI assistant', description: 'Connect Claude, ChatGPT or Claude Code to your portfolio in a few steps.',
    blocks: [
      { t: 'h', text: 'After connecting: your first message' },
      { t: 'p', text: 'Start a new chat by pasting this:' },
      { t: 'code', text: FIRST_CHAT_MESSAGE },
      { t: 'note', text: FIRST_CHAT_NOTE },
      { t: 'p', text: 'The assistant connection is included with the Pro plan. You add LivePortfolio to your assistant once; after that you can ask for changes in plain words.' },
      { t: 'p', text: 'Easiest route: open liveportfolio.site/connect for the steps for Claude and ChatGPT.' },
      { t: 'p', text: 'The address to add:' },
      { t: 'code', text: MCP_URL },
      { t: 'h', text: 'Claude (web and desktop)' }, { t: 'ol', items: CONNECT_STEPS.claude },
      { t: 'h', text: 'ChatGPT' }, { t: 'ol', items: CONNECT_STEPS.chatgpt },
      { t: 'note', text: 'ChatGPT may only offer custom connectors on some of its plans or in developer mode. If you do not see the option, see Troubleshooting.' },
      { t: 'h', text: 'Claude Code' },
      { t: 'code', text: `claude mcp add --transport http liveportfolio ${MCP_URL}` },
      { t: 'ol', items: CONNECT_STEPS.claudeCode.slice(1) },
      { t: 'h', text: 'On the consent screen' },
      { t: 'ul', items: ['Allow edits: on lets the assistant save changes; off makes it read-only.', 'Share my email, phone and WhatsApp: off by default. Turn it on only if you want the assistant to read them.'] },
    ],
  },
  {
    slug: 'what-it-can-do', group: 'AI assistant', title: 'What the assistant can do', description: 'Everything you can ask for, from text edits to pictures and designs.',
    blocks: [
      { t: 'ul', items: [
        'Read your portfolio and tell you what is missing or weak.',
        'Edit your name, role, headline, About, location, skills, projects, jobs and contact links.',
        'Record news as you tell it: a new certification, degree, job, promotion, award or project. Say "I just passed the Azure AI-102 exam" and it offers to add it, adds only what you said, and asks for anything missing. Duplicates are caught.',
        'Add a project or a job from text you paste, such as a README or a CV line. New jobs go in date order.',
        'Add to a field without rewriting it, change one phrase, or add, reword and reorder the highlight lines of a role.',
        'Check your portfolio for gaps: a short About, no education, projects with no outcome or picture.',
        'Reorder projects, jobs, education, certifications, testimonials and skill groups.',
        'Fix one education entry or one certification, add, fix or remove a testimonial, and add, rename or remove a skill group, without touching the rest.',
        'Add an interactive Power BI dashboard to a project (see Editing).',
        'Switch your design and its look (arrangement, accent, density). Designs your plan does not include are refused.',
        'Add or replace your profile photo and project pictures, with a private upload link or from a public https address.',
        'Undo the last change, or go back to an earlier version.',
      ] },
      { t: 'p', text: 'Some changes are not applied by the assistant. Removing a project, job or line, replacing a whole list (testimonials, skill groups), adding or changing a link, edits that sharply cut existing text, batches of changes and restoring an old version need your approval first. See Safety.' },
      { t: 'p', text: 'The full list of tools is in the tools reference.' },
    ],
  },
  {
    slug: 'example-prompts', group: 'AI assistant', title: 'Example prompts', description: 'Things to ask your assistant.',
    blocks: [
      { t: 'ul', items: EXAMPLES },
      { t: 'ul', items: ['Read my portfolio and tell me the three most useful things to improve.', 'Make my headline specific to the work I actually do. Give me three options first.', 'Reorder my projects so the strongest one is first.'] },
      { t: 'h', text: 'Keep it in sync' },
      { t: 'p', text: 'Add this line to your custom instructions in Claude (Projects) or ChatGPT so your assistant offers to update your portfolio when you mention career news:' },
      { t: 'code', text: 'When I mention a new job, promotion, certification, degree, award or project, offer to add it to my LivePortfolio.' },
      { t: 'ul', items: ['What is new in my career? Check my recent chats and suggest portfolio updates.', 'I just passed the Azure AI-102 exam.'] },
      { t: 'note', text: 'Assistants only act in chats where the connector is available, and most ask you to confirm before changing anything. It is "tell your assistant and it updates", not silent background updates. The assistant only uses facts you give it. If it asks for a number or a date, tell it the real one.' },
    ],
  },
  {
    slug: 'safety', group: 'AI assistant', title: 'Safety', description: 'What the assistant cannot do, and how you stay in control.',
    blocks: [
      { t: 'h', text: 'It can never' }, { t: 'ul', items: CANNOT },
      { t: 'p', text: 'These are not tools, so no instruction can make an assistant do them.' },
      { t: 'h', text: 'You stay in control' },
      { t: 'ul', items: [
        'Every change is saved as a version. Say "undo that", or use History in your dashboard. "Undo" only reverses a change an assistant made, never an edit you made yourself in the dashboard.',
        'Your portfolio as it was before an assistant first touched it is kept permanently, so you can always go back to it from History.',
        'Adding or changing a link needs your approval, because a swapped link on a public page is risky.',
        'An edit that would sharply cut existing text becomes an approval request instead of being saved.',
        'Removing things, replacing whole lists, links, large cuts, batches and restoring old versions need you to approve on liveportfolio.site. The assistant only gets a link; it cannot approve for you. A request expires after 30 minutes and is refused if your portfolio changed in the meantime.',
        'Your email, phone and WhatsApp are hidden from the assistant unless you allow them.',
        'You can connect read-only.',
        'Limits: 30 skills, 1500 characters per project text, 60 changes in one batch. One thing is saved but not shown: skills that are not in a group when you have groups (the page shows the groups). Your assistant tells you when that happens.',
        'Disconnect at any time (see Manage and disconnect). The next request from that app is refused.',
        'Pictures are checked and re-encoded. Upload links work once, for 10 minutes, and only while you are signed in.',
      ] },
      { t: 'note', text: 'What you ask the assistant, and your portfolio text it reads, goes to the assistant provider you chose (Claude or ChatGPT) under their terms. LivePortfolio keeps counts and tool names for limits and safety, not your messages.' },
    ],
  },
  {
    slug: 'revoke', group: 'AI assistant', title: 'Manage and disconnect', description: 'See connected apps and remove them.',
    blocks: [
      { t: 'ol', items: ['Open Connected apps at liveportfolio.site/oauth/connections (also linked from your dashboard).', 'Choose Disconnect next to the app.'] },
      { t: 'p', text: 'The app can no longer read or change your portfolio from its next request. Changes it already made stay, and you can undo them from History.' },
    ],
  },
  {
    slug: 'troubleshooting', group: 'AI assistant', title: 'Troubleshooting', description: 'If connecting or editing does not work.',
    blocks: [
      { t: 'h', text: 'It says this is not available for my account' }, { t: 'p', text: 'The assistant connection is included with the Pro plan.' },
      { t: 'h', text: 'I cannot add a custom connector' }, { t: 'p', text: 'Claude and ChatGPT decide which of their plans can add custom connectors, and ChatGPT may require developer mode. Check their settings, or use Claude Code, which has no such limit.' },
      { t: 'h', text: 'The sign-in page says the request is no longer valid' }, { t: 'p', text: 'The sign-in request expires quickly. Start the connection again from the assistant.' },
      { t: 'h', text: 'It says my portfolio changed' }, { t: 'p', text: 'You or another app edited it after the assistant last read it. Ask it to read your portfolio again, then repeat the request.' },
      { t: 'h', text: 'The assistant cannot see my email or phone' }, { t: 'p', text: 'That is the default. Disconnect and connect again with "Share my email, phone and WhatsApp" on.' },
      { t: 'h', text: 'A change was not applied' }, { t: 'p', text: 'Removals and whole-list replacements wait for your approval. Open the link the assistant gave you and press Approve.' },
      { t: 'p', text: `Still stuck? Email ${SUPPORT_EMAIL}.` },
    ],
  },
  {
    slug: 'designs', group: 'Portfolio', title: 'Designs', description: 'Templates, looks and Pro designs.',
    blocks: [
      { t: 'ul', items: ['Free accounts can switch between three designs; Pro adds seven more role-specific designs.', 'Every design can be previewed with your own details before you choose.', 'The look (arrangement, accent colour, density) can be changed on the free designs.', 'Some Pro designs have an original and a redesigned version; you choose which to use.'] },
    ],
  },
  {
    slug: 'editing', group: 'Portfolio', title: 'Editing', description: 'Change your portfolio any time, with history.',
    blocks: [
      { t: 'ul', items: ['Edit every section in your dashboard: introduction, projects, experience, education, certifications, skills and links.', 'Changes need no AI and no waiting.', 'Add an interactive Power BI dashboard under a project picture: in Power BI choose File, Embed report, Publish to web, and paste the link in the project\'s dashboard field. Visitors can hover and click it. Anyone with the link can see the data, so only use data you are happy to share. It is shown on the free designs; the Pro designs show your picture.', 'History keeps your recent versions so you can undo.', 'The completeness checklist shows what to add next.'] },
    ],
  },
  {
    slug: 'sharing-analytics', group: 'Portfolio', title: 'Sharing and analytics', description: 'Publish, share and see who looks.',
    blocks: [
      { t: 'ul', items: ['A published portfolio lives at yourname.liveportfolio.site and also shares well on WhatsApp and LinkedIn with a preview image.', 'Basic portfolios carry a small "Built with liveportfolio.site" badge; Pro removes it.', 'Pro shows who views you: visitors and visits, top source and top countries, and includes a QR code and weekly career insights.'] },
    ],
  },
  {
    slug: 'plans', group: 'Account', title: 'Plans', description: 'What each plan includes.',
    blocks: [
      { t: 'ul', items: ['Free: build, edit and preview privately with three designs.', 'Basic: publish your portfolio at your own address.', 'Pro: everything in Basic, plus all ten designs, no badge, analytics, QR code, weekly insights and the assistant connection.'] },
      { t: 'p', text: 'Prices are on the home page. Paid plans have a 7-day refund guarantee; see the terms.' },
    ],
  },
  {
    slug: 'your-data', group: 'Account', title: 'Your data', description: 'What we keep and how to delete it.',
    blocks: [
      { t: 'ul', items: ['You can delete your account from your dashboard settings. This removes your portfolio and account.', 'The assistant cannot delete anything about your account. Disconnect any assistant at liveportfolio.site/oauth/connections.', 'Read the privacy policy for what we collect and why.'] },
      { t: 'p', text: 'Privacy policy: liveportfolio.site/privacy. Terms: liveportfolio.site/terms.' },
    ],
  },
  {
    slug: 'support', group: 'Help', title: 'Support', description: 'How to get help.',
    blocks: [{ t: 'p', text: `Email ${SUPPORT_EMAIL}. Include the address of your portfolio and what you were trying to do. Never send your password.` }],
  },
  {
    slug: 'changelog', group: 'Help', title: 'Changelog', description: 'What changed and when.',
    blocks: [
      { t: 'h', text: '21 November 2026' },
      { t: 'ul', items: ['AI assistant connection for Pro: edit your portfolio from Claude, ChatGPT or Claude Code.', 'Sign in with Google.', 'Documentation site.', 'Power BI dashboards on projects (free designs).', 'The assistant can fix one education entry or certification, manage testimonials and skill groups, and reorder lists.', 'The approval page shows a before and after, and tells you to go back to your chat.', 'Easier connect pages for Claude and ChatGPT.', 'The privacy policy covers connected assistants.'] },
      { t: 'h', text: '20 November 2026' },
      { t: 'ul', items: ['Portfolio guides for twelve professions.', 'Basic portfolios show a small badge; Pro removes it.', 'Contact links shown as icons on every screen size.'] },
    ],
  },
]

export const docBySlug = (slug: string) => DOC_PAGES.find((p) => p.slug === slug)
export const DOC_GROUPS = ['Start', 'AI assistant', 'Portfolio', 'Account', 'Help'] as const
