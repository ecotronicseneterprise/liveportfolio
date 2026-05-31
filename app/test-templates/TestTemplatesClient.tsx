'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import type { PortfolioContent } from '@/components/templates/Minimal'

const Minimal = dynamic(() => import('@/components/templates/Minimal'), { ssr: false })
const Bold = dynamic(() => import('@/components/templates/Bold'), { ssr: false })

const datasetA: PortfolioContent = {
  name: 'Amara Osei',
  role: 'Frontend Developer',
  headline: 'Building accessible, fast web interfaces with React and TypeScript.',
  about: 'I completed the ALX Software Engineering programme in March 2026. I am actively building projects and looking for my first remote role.',
  location: 'Accra, Ghana',
  email: 'amara@example.com',
  github_url: 'https://github.com/amaraosei',
  linkedin_url: '',
  avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=300&fit=crop&crop=faces&facepad=3',
  skills: ['React', 'TypeScript', 'HTML', 'CSS', 'Git'],
  skills_narrative: 'Frontend focused with a strong foundation in React.',
  skills_grouped: [],
  projects: [
    {
      title: 'Budget Tracker App',
      problem: 'Students at ALX had no simple way to track monthly expenses.',
      solution: 'Built a React app with local storage persistence and chart visualisations.',
      outcome: 'Used by 40+ ALX students within 2 weeks of launch.',
      stack: ['React', 'Chart.js', 'CSS'],
      url: 'https://github.com/amaraosei/budget-tracker',
      image_url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=640&h=360&fit=crop',
    },
  ],
  experience: [],
}

const datasetB: PortfolioContent = {
  name: 'Chukwuemeka Adeyemi',
  role: 'Senior Data Scientist & ML Engineer',
  headline: 'Building production ML systems that move business metrics, not just model benchmarks.',
  about: '8 years building data products across banking, fintech, and healthtech in Nigeria and remotely for European companies.\n\nI specialise in the gap between ML research and production systems — taking models from notebook to pipeline to revenue impact.',
  location: 'Lagos, Nigeria',
  email: 'emeka@example.com',
  github_url: 'https://github.com/emekaokfor',
  linkedin_url: 'https://linkedin.com/in/emekaokfor',
  avatar_url: '',
  skills: ['Python', 'SQL', 'PyTorch', 'TensorFlow', 'Azure ML', 'Spark', 'dbt', 'Airflow', 'FastAPI', 'Docker', 'Kubernetes', 'PostgreSQL'],
  skills_narrative: 'End-to-end ML: from feature engineering to production inference pipelines.',
  skills_grouped: [
    { category: 'ML & AI', items: ['PyTorch', 'TensorFlow', 'Scikit-learn', 'Azure ML'] },
    { category: 'Data Engineering', items: ['Spark', 'dbt', 'Airflow', 'PostgreSQL'] },
    { category: 'Languages', items: ['Python', 'SQL', 'TypeScript'] },
    { category: 'Infrastructure', items: ['Docker', 'Kubernetes', 'FastAPI', 'Azure'] },
  ],
  projects: [
    {
      title: 'Corporate Churn Intelligence System',
      problem: 'Bank losing high-value corporate accounts with no early warning system.',
      solution: 'Built a monthly ML pipeline on Azure ML scoring 8,000+ corporate accounts for churn risk using random forest with 89% recall.',
      outcome: 'Recovered 429 customers, reactivated ₦191.5B in turnover in first quarter.',
      stack: ['Python', 'Azure ML', 'Synapse', 'SQL', 'scikit-learn'],
      url: '',
    },
    {
      title: 'Conversational Analytics Platform',
      problem: 'Business analysts spending 4+ hours daily writing SQL reports.',
      solution: 'GPT-4o powered natural language to SQL system with RLS-enforced data governance and Chart.js visualisations.',
      outcome: 'Reduced ad-hoc report turnaround from 4 hours to under 2 minutes for 200+ users.',
      stack: ['Next.js', 'FastAPI', 'Azure OpenAI', 'Azure Synapse', 'Chart.js'],
      url: '',
    },
    {
      title: 'RFID Attendance SaaS',
      problem: 'Schools and companies managing attendance with paper registers.',
      solution: 'ESP32 + MFRC522 RFID hardware nodes syncing to Supabase with captive portal zero-touch provisioning.',
      outcome: 'Deployed in 3 institutions, processing 500+ daily check-ins with 99.7% uptime.',
      stack: ['ESP32', 'Supabase', 'Next.js', 'Paystack'],
      url: 'https://github.com/example/rfid-attendance',
    },
    {
      title: 'AI Job Matching Platform',
      problem: 'African tech job seekers applying to 50+ roles manually with no targeting.',
      solution: 'Next.js platform with pgvector semantic matching, GPT-4o-mini match reasoning, and WhatsApp job alerts.',
      outcome: 'Live product with paying subscribers, 85% reduction in irrelevant applications reported by users.',
      stack: ['Next.js', 'Supabase', 'pgvector', 'OpenAI', 'WasenderAPI', 'Paystack'],
      url: 'https://upjobs.co',
    },
  ],
  experience: [
    {
      company: 'Wema Bank',
      role: 'Data Scientist / AI Engineer',
      period: 'March 2025 – Present',
      bullets: [
        'Built and deployed CRIS churn pipeline scoring 8,000+ corporate accounts monthly on Azure ML',
        'Architected Data Knight conversational analytics platform with GPT-4o and Azure Synapse',
        'Designed RLS-enforced SQL governance layer preventing unauthorised data access',
        'Led AI adoption workshop for 50+ relationship managers across retail banking',
      ],
    },
    {
      company: 'Coscharis Medical',
      role: 'Service Engineer',
      period: '2022 – 2025',
      bullets: [
        'Maintained and calibrated diagnostic imaging equipment across 12 hospital sites',
        'Built internal fault tracking dashboard reducing repeat equipment failures by 30%',
        'Trained 20+ biomedical technicians on preventive maintenance protocols',
      ],
    },
    {
      company: 'Ecotronics Enterprise',
      role: 'Founder / Embedded Systems Engineer',
      period: '2020 – Present',
      bullets: [
        'Designed and shipped IoT attendance hardware used in 3 Nigerian institutions',
        'Built solar monitoring SaaS with real-time telemetry and Paystack subscription billing',
        'Won 2nd place National and 1st place Regional at CODET engineering competition',
      ],
    },
  ],
}

export default function TestTemplatesClient() {
  const [dataset, setDataset] = useState<'A' | 'B'>('A')
  const [template, setTemplate] = useState<'minimal' | 'bold'>('minimal')

  const content = dataset === 'A' ? datasetA : datasetB

  return (
    <div>
      {/* Fixed control bar */}
      <div className="fixed top-0 left-0 right-0 z-[9999]">
        <div className="bg-white border-b border-gray-200 px-6 py-2.5 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Dataset:</span>
            <button
              onClick={() => setDataset('A')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${dataset === 'A' ? 'bg-[#0A66C2] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              A — Fresh grad, 1 project
            </button>
            <button
              onClick={() => setDataset('B')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${dataset === 'B' ? 'bg-[#0A66C2] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              B — Senior, full content
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Template:</span>
            <button
              onClick={() => setTemplate('minimal')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${template === 'minimal' ? 'bg-[#0A66C2] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Minimal
            </button>
            <button
              onClick={() => setTemplate('bold')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${template === 'bold' ? 'bg-[#0A66C2] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Bold
            </button>
          </div>
        </div>
      </div>

      {/* Template output — offset for control bar (~48px) */}
      <div className="pt-[48px]">
        {template === 'minimal' ? (
          <Minimal content={content} />
        ) : (
          <Bold content={content} />
        )}
      </div>
    </div>
  )
}
