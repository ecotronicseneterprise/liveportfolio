import localFont from 'next/font/local'
import type { ReactNode } from 'react'
import { t } from '@/lib/onboarding/t'
import { CheckIcon } from './icons'
import './tokens.css'
import './flow.css'

// One family, two weights (500, 700), self-hosted: the file ships with the app, nothing loads from Google at runtime.
const sans = localFont({
  src: './fonts/BricolageGrotesque.woff2',
  weight: '200 800',
  display: 'swap',
  variable: '--lp-font',
  fallback: ['system-ui', 'Segoe UI', 'sans-serif'],
  adjustFontFallback: 'Arial',
})

export const FLOW_STEPS = ['account', 'import', 'review', 'address', 'generate'] as const
export type FlowStep = (typeof FLOW_STEPS)[number]

function Progress({ step }: { step: FlowStep }) {
  const at = FLOW_STEPS.indexOf(step)
  return (
    <>
      <ol className="lp-steps" aria-label={t('ui.progress')}>
        {FLOW_STEPS.map((s, i) => (
          <li key={s} aria-current={i === at ? 'step' : undefined} data-done={i < at}>
            <span className="lp-dot">{i < at ? <CheckIcon /> : i + 1}</span>
            {t(`ui.steps.${s}`)}
          </li>
        ))}
      </ol>
      <span className="lp-compact">
        {t('ui.stepOf', { n: at + 1, total: FLOW_STEPS.length })} · <b>{t(`ui.steps.${step}`)}</b>
      </span>
    </>
  )
}

/**
 * The frame every step of the account-first flow sits in: logo top-left, a progress indicator (a numbered trail on a laptop,
 * "Step 2 of 5 · Import" and a thin bar on a phone), and one of three bodies:
 *   - aside given: split layout, form left and a calm panel right (single column on a phone)
 *   - wide:        the step lays itself out (review: form + live preview)
 *   - otherwise:   one centred column
 * Layout only. No logic lives here.
 */
export default function FlowShell({ step, aside, wide, width, children }: { step?: FlowStep | null; aside?: ReactNode; wide?: boolean; width?: 'sm' | 'md'; children: ReactNode }) {
  const at = step ? FLOW_STEPS.indexOf(step) : -1
  return (
    <div className={`lp ${sans.variable}`}>
      <header className="lp-header">
        <a className="lp-brand" href="/" aria-label={t('ui.home')}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" width={28} height={28} />
          LivePortfolio
        </a>
        {step && <Progress step={step} />}
      </header>
      {step && (
        <div className="lp-bar" aria-hidden="true">
          {FLOW_STEPS.map((s, i) => <i key={s} data-on={i <= at} />)}
        </div>
      )}
      {aside ? (
        <div className="lp-body lp-split">
          <div className="lp-col"><div className="lp-col-in">{children}</div></div>
          <aside className="lp-aside"><div className="lp-aside-in">{aside}</div></aside>
        </div>
      ) : wide ? (
        <div className="lp-body">{children}</div>
      ) : (
        <div className="lp-body"><div className="lp-narrow" data-width={width ?? 'sm'}>{children}</div></div>
      )}
    </div>
  )
}

/** The loading state of a step: same frame, a quiet placeholder, nothing for a screen reader to trip over. */
export function FlowLoading({ step }: { step?: FlowStep | null }) {
  return (
    <FlowShell step={step}>
      <div role="status"><span className="lp-sr">{t('ui.loading')}</span><div className="lp-skeleton" aria-hidden="true" /></div>
    </FlowShell>
  )
}
