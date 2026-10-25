// "Three looks. Your words." Replaces the old Templates section, whose drawn mock-ups showed designs that no longer exist. This one loads no extra
// fonts: each card shows the look's name, who it suits, its typefaces by name and its real palette.
import { t } from '@/lib/onboarding/t'
import './landing.css'

const LOOKS = [
  { id: 'studio', palette: ['#0F172A', '#0A66C2', '#F1F5F9', '#FFE066'] },
  { id: 'journal', palette: ['#1B1B18', '#1B6B3A', '#F0EEE6', '#E3F0A8'] },
  { id: 'ledger', palette: ['#111111', '#B3261E', '#F4F4F5', '#FFD9D5'] },
] as const

export default function LooksSection() {
  return (
    <section className="w-full border-b border-gray-100" aria-labelledby="looks-h">
      <div className="w-full px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
        <h2 id="looks-h" className="text-3xl sm:text-4xl font-bold text-[#0A0A0A] mb-3 leading-tight">{t('landing.looksTitle')}</h2>
        <p className="text-lg text-gray-700 leading-relaxed mb-10 max-w-2xl">{t('landing.looksLede')}</p>
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-5 list-none p-0 m-0">
          {LOOKS.map((l) => (
            <li key={l.id} className="look-card">
              <h3 className="text-xl font-bold text-gray-900 mb-1">{t(`portfolio.look.${l.id}`)}</h3>
              <p className="text-base text-gray-800 mb-3">{t(`portfolio.lookNote.${l.id}`)}</p>
              <p className="text-base text-gray-700 mb-3">{t(`landing.lookFor.${l.id}`)}</p>
              <p className="text-sm text-gray-600">{t('landing.typefaces', { fonts: t(`landing.lookFont.${l.id}`) })}</p>
              <ul className="look-chips" aria-hidden="true">
                {l.palette.map((c) => <li key={c} style={{ background: c }} />)}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
