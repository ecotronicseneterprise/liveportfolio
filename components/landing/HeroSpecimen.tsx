// The landing page's hero picture: a REAL portfolio, drawn by the same block renderer every new portfolio uses, with invented content (a made-up
// person), in each of the three looks. A CSS-only switch (radio inputs and sibling selectors) changes the look, so it works with no JavaScript
// and has no carousel, no autoplay and no layout shift. Server component: it ships as HTML.
import type { PortfolioContent } from '@/components/templates/Minimal'
import Journal from '@/components/blocks/looks/Journal'
import Ledger from '@/components/blocks/looks/Ledger'
import Studio from '@/components/blocks/looks/Studio'
import type { SectionSpec } from '@/lib/blocks/presets'
import { t } from '@/lib/onboarding/t'
import './landing.css'

const specimen = (): PortfolioContent => ({
  name: t('landing.specimenName'),
  role: t('landing.specimenRole'),
  headline: t('landing.specimenHeadline'),
  about: t('landing.specimenAbout'),
  location: t('landing.specimenLocation'),
  email: 'nwannachumaclifford@gmail.com',
  avatar_url: '/landing/dev-avatar.jpg',
  skills: [],
  skills_narrative: '',
  skills_grouped: [
    { category: t('landing.specimenSkillsLabel'), items: t('landing.specimenSkills').split(', ') },
    { category: t('landing.specimenSkillGroup2'), items: t('landing.specimenSkills2').split(', ') },
  ],
  projects: [1, 2, 3].map((n) => ({
    title: t(`landing.specimenProject${n}`),
    problem: t(`landing.specimenProblem${n}`),
    solution: t(`landing.specimenSolution${n}`),
    outcome: t(`landing.specimenOutcome${n}`),
    stack: [],
    image_url: `/landing/project-${n}.jpg`,
  })),
  experience: [1, 2].map((n) => ({
    company: t(`landing.specimenJob${n}Company`),
    role: t(`landing.specimenJob${n}Role`),
    period: t(`landing.specimenJob${n}Period`),
    bullets: [t(`landing.specimenJob${n}Bullet1`), t(`landing.specimenJob${n}Bullet2`)],
  })),
})

const s = (block: SectionSpec['block'], variant: string): SectionSpec => ({ block, variant })
const STUDIO: SectionSpec[] = [s('hero', 'statement'), s('projects', 'proof'), s('experience', 'timeline'), s('skills', 'groups'), s('contact', 'band')]
const JOURNAL: SectionSpec[] = [s('hero', 'split'), s('about', 'prose'), s('projects', 'rows'), s('experience', 'timeline'), s('skills', 'groups'), s('contact', 'plain')]
const LEDGER: SectionSpec[] = [s('hero', 'compact'), s('about', 'columns'), s('projects', 'index'), s('experience', 'table'), s('skills', 'inline'), s('contact', 'plain')]

const LOOKS = [
  { id: 'studio', label: t('portfolio.look.studio') },
  { id: 'journal', label: t('portfolio.look.journal') },
  { id: 'ledger', label: t('portfolio.look.ledger') },
] as const

export default function HeroSpecimen() {
  const content = specimen()
  return (
    <figure className="spec" style={{ margin: 0 }} aria-label={t('landing.specimenLabel')}>
      <div role="radiogroup" aria-labelledby="spec-legend">
        <p id="spec-legend" className="sr-only">{t('landing.lookGroup')}</p>
        <input className="spec-r" type="radio" name="spec-look" id="spec-studio" defaultChecked />
        <input className="spec-r" type="radio" name="spec-look" id="spec-journal" />
        <input className="spec-r" type="radio" name="spec-look" id="spec-ledger" />
        <div className="spec-bar">
          {LOOKS.map((l) => <label key={l.id} htmlFor={`spec-${l.id}`}>{l.label}</label>)}
        </div>
        <div className="browser-window">
          <div className="browser-chrome" aria-hidden="true">
            <div className="browser-tabs"><i /><i /><i /><span className="browser-tab">{content.name} — Portfolio</span><b>+</b></div>
            <div className="browser-toolbar"><span className="browser-controls">‹　›　↻</span><span className="browser-address"><span>⌑</span> liveportfolio.site/clifford-nwanna <span className="browser-lock">Secure</span></span><span className="browser-menu">⋮</span></div>
          </div>
          <div className="spec-frame" tabIndex={0} role="region" aria-label={t('landing.specimenScrollLabel')}>
            {/* inert: it is a picture of a portfolio, so its links and fields are not part of the page's tab order */}
            <div className="spec-pane spec-pane-studio" inert><Studio content={content} layout={{ v: 1, arrangement: 'proof' }} sections={STUDIO} idPrefix="sp-studio" credit={false} /></div>
            <div className="spec-pane spec-pane-journal" inert><Journal content={content} layout={{ v: 1, arrangement: 'profile' }} sections={JOURNAL} idPrefix="sp-journal" credit={false} /></div>
            <div className="spec-pane spec-pane-ledger" inert><Ledger content={content} layout={{ v: 1, arrangement: 'index' }} sections={LEDGER} idPrefix="sp-ledger" credit={false} /></div>
          </div>
        </div>
      </div>
      <figcaption className="spec-cap">{t('landing.specimenCaption')}. {t('landing.specimenNote')}</figcaption>
    </figure>
  )
}
