import BlockPortfolio, { type BlockPortfolioProps } from '../BlockPortfolio'
import { journalFonts } from './fonts-journal'

/** Journal: calm and editorial, a person and their cases (Source Serif 4 + Hanken Grotesk). This is the free "Minimal" template id. */
export default function Journal(props: Omit<BlockPortfolioProps, 'theme' | 'fontClass'>) {
  return <BlockPortfolio {...props} theme="journal" fontClass={journalFonts} />
}
