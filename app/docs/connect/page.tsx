import DocPage, { generateMetadata as docMetadata } from '../[slug]/page'
import { CONNECT_CLIENTS } from '@/lib/docs/connect'

// /docs/connect: the general guide, plus a short way into each assistant's two-step page.
export const generateMetadata = () => docMetadata({ params: Promise.resolve({ slug: 'connect' }) })

export default function ConnectIndex() {
  return (
    <>
      <nav aria-label="Choose your assistant" className="mb-6 flex flex-col gap-2 sm:flex-row">
        {CONNECT_CLIENTS.map((c) => (
          <a key={c.slug} href={`/docs/connect/${c.slug}`} className="inline-flex min-h-11 items-center justify-center rounded-full border border-neutral-300 px-5 text-sm font-semibold hover:bg-neutral-50">{c.name}</a>
        ))}
      </nav>
      <DocPage params={Promise.resolve({ slug: 'connect' })} />
    </>
  )
}
