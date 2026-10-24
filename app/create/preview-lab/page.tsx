import { notFound } from 'next/navigation'
import PreviewLab from '@/components/onboarding/PreviewLab'

export const dynamic = 'force-dynamic'

// Measurement harness for the template gallery (scripts/perf-gallery.mjs). 404 unless NEXT_PUBLIC_PREVIEW_LAB=true at
// build time, which is never set for Vercel. No account, no data: it renders sample text only.
export default function Page() {
  if (process.env.NEXT_PUBLIC_PREVIEW_LAB !== 'true') notFound()
  return <PreviewLab />
}
