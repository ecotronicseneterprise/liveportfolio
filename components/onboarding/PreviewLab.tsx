'use client'

import { useMemo, useState } from 'react'
import TemplateGallery from './TemplateGallery'
import FlowShell from './ui/FlowShell'
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
    <FlowShell width="md">
      <label className="lp-field" style={{ marginBottom: 'var(--lp-s4)' }}>
        <span className="lp-label">Name</span>
        <input id="lab-name" className="lp-input" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <TemplateGallery content={content} selected={selected} onSelect={setSelected} />
    </FlowShell>
  )
}
