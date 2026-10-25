import BlockPortfolio, { type BlockPortfolioProps } from '../BlockPortfolio'
import { studioFonts } from './fonts-studio'

/** Studio: your results first, set large (Bricolage Grotesque + Hanken Grotesk). This is the free "Creative" template id. */
export default function Studio(props: Omit<BlockPortfolioProps, 'theme' | 'fontClass'>) {
  return <BlockPortfolio {...props} theme="studio" fontClass={studioFonts} />
}
