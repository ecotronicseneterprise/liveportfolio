// The one instruction that makes an assistant use LivePortfolio in a new chat. Shown first on the dashboard card and in every guide.
// Kept in its own tiny file so client components can import it without pulling server code into the browser bundle.
export const SYNC_INSTRUCTION = 'When I mention a new job, promotion, certification, degree, award or project, offer to add it to my LivePortfolio.'
export const SYNC_NOTE = 'Paste this into your custom instructions once. Without it, a new chat can give a generic answer, because the assistant does not know to use LivePortfolio. You can also start a chat with "Use LivePortfolio: ...".'
