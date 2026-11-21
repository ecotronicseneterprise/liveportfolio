// Text shown first on the dashboard card, /connect and every setup guide. Kept in its own tiny file so client components can import
// it without pulling server code into the browser bundle.

/** The message to paste as the FIRST message of a new chat after connecting. It names LivePortfolio (so the assistant uses the
 *  connector instead of answering generically), makes it read the portfolio first, and sets the offer-and-ask behaviour. */
export const FIRST_CHAT_MESSAGE =
  'Use LivePortfolio to read my professional portfolio, and use it as context for career advice, job applications, CV improvements and interview preparation.\n\n' +
  'Whenever I mention a new certification, project, job, promotion, award or degree, offer to add it to my LivePortfolio, and ask me before you change anything.\n\n' +
  'Start by reviewing my portfolio: summarize my profile and tell me the most useful thing to improve next.'

export const FIRST_CHAT_NOTE =
  'Paste this as the first message of a new chat. Naming LivePortfolio is what makes the assistant use it; without that, a new chat can give a generic answer.'

/** The permanent version for custom instructions (Claude Project instructions, ChatGPT Personalization). */
export const SYNC_INSTRUCTION = 'When I mention a new job, promotion, certification, degree, award or project, offer to add it to my LivePortfolio.'
export const SYNC_NOTE = 'Optional: add this to your custom instructions once, so every new chat already knows to use LivePortfolio.'
