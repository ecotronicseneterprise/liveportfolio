import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ConnectGuide from '@/components/docs/ConnectGuide'
import { CONNECT_CLIENTS, clientBySlug } from '@/lib/docs/connect'

export const dynamicParams = false
export const generateStaticParams = () => CONNECT_CLIENTS.map((c) => ({ client: c.slug }))

export async function generateMetadata({ params }: { params: Promise<{ client: string }> }): Promise<Metadata> {
  const c = clientBySlug((await params).client)
  if (!c) return {}
  return { title: `Connect ${c.name} to LivePortfolio`, description: c.blurb, alternates: { canonical: `/docs/connect/${c.slug}` } }
}

export default async function ConnectClientPage({ params }: { params: Promise<{ client: string }> }) {
  const c = clientBySlug((await params).client)
  if (!c) notFound()
  return <ConnectGuide client={c} />
}
