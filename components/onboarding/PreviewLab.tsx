'use client'

import { useMemo, useState } from 'react'
import TemplateGallery from './TemplateGallery'
import { sanitizeDraft, type Draft } from '@/lib/onboarding/draft'
import { draftToPreviewContent } from '@/lib/onboarding/preview-content'

const SAMPLE = sanitizeDraft({
  name: 'Ada Okonkwo', role: 'Backend engineer', bio: 'I build payment systems that stay up. Five years of Go and Postgres.',
  location: 'Lagos', skills: ['Go', 'Postgres', 'Kubernetes', 'gRPC', 'Terraform'],
  projects: [
    { title: 'Invoice parser', description: 'Reads supplier invoices and posts them to the ledger.', stack: 'python, postgres' },
    { title: 'Rate limiter', description: 'Token-bucket limiter shared by 12 services.', stack: 'go, redis' },
  ],
  experience: [{ company: 'Acme Payments', role: 'Software engineer', period: '2021 to now', bullets: 'Cut p95 latency by 40%\nLed the ledger migration' }],
}) as Draft

export default function PreviewLab() {
  const [name, setName] = useState(SAMPLE.name)
  const [selected, setSelected] = useState('minimal')
  const content = useMemo(() => draftToPreviewContent({ ...SAMPLE, name }, 'ada@example.com'), [name])
  return (
    <main className="max-w-3xl mx-auto p-4">
      <label className="block mb-3">Name
        <input id="lab-name" className="block w-full border rounded px-3 min-h-11" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <TemplateGallery content={content} selected={selected} onSelect={setSelected} />
    </main>
  )
}
