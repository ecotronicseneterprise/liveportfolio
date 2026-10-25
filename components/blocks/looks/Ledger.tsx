import BlockPortfolio, { type BlockPortfolioProps } from '../BlockPortfolio'
import { ledgerFonts } from './fonts-ledger'

/** Ledger: ruled and exact, one row per piece of work (Schibsted Grotesk + Space Mono). This is the free "Bold" template id. */
export default function Ledger(props: Omit<BlockPortfolioProps, 'theme' | 'fontClass'>) {
  return <BlockPortfolio {...props} theme="ledger" fontClass={ledgerFonts} />
}
