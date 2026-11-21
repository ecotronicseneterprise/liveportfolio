// The one message people paste as the FIRST message of a new chat after connecting. It names the LivePortfolio MCP (so the assistant
// knows which tool to use instead of answering generically) and includes the standing instruction, so there is only one thing to copy.
// Kept in its own tiny file so client components can import it without pulling server code into the browser bundle.
export const FIRST_CHAT_MESSAGE =
  'Use the LivePortfolio MCP to read my portfolio and use it as context for career advice, CVs and interviews. ' +
  'Whenever I mention a new certification, project, job, promotion, award or degree, offer to add it to my LivePortfolio using the LivePortfolio MCP, and ask me before you change anything. ' +
  'Start by summarizing my profile and the most useful thing to improve next.'

export const FIRST_CHAT_NOTE = 'Paste it as the first message of a new chat, so your assistant knows to use LivePortfolio.'

// Kept for older imports: the standing instruction is now part of the single message above.
export const SYNC_INSTRUCTION = FIRST_CHAT_MESSAGE
export const SYNC_NOTE = FIRST_CHAT_NOTE
