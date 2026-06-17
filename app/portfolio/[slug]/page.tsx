import React from 'react'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'

export const revalidate = 43200 // 12 hours — revalidatePath in /api/update busts this on every save
import { createHash } from 'crypto'
import type { Metadata } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getIpInfo } from '@/lib/ipinfo'
import Minimal from '@/components/templates/Minimal'
import Bold from '@/components/templates/Bold'
import Creative from '@/components/templates/Creative'
import Developer from '@/components/templates/Developer'
import Designer from '@/components/templates/Designer'
import DataScientist from '@/components/templates/DataScientist'
import ProductManager from '@/components/templates/ProductManager'
import Finance from '@/components/templates/Finance'
import Graduate from '@/components/templates/Graduate'
import Cybersecurity from '@/components/templates/Cybersecurity'
import type { PortfolioContent } from '@/components/templates/Minimal'
import ClientAnalytics from './ClientAnalytics'
import AcquisitionBar from './AcquisitionBar'
import DemoToggle from './DemoToggle'

const DEMO_SLUGS = new Set([
  'james-chen', 'sofia-martinez', 'fatima-hassan',
  'david-mensah', 'priya-sharma', 'chidi-okafor',
  'michael-roberts', 'elena-vasquez',
])

const DEMO_PORTFOLIOS: Record<string, { template: 'minimal' | 'bold' | 'creative'; content: PortfolioContent }> = {
  amara: {
    template: 'bold',
    content: {
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
    },
  },
  benedicta: {
    template: 'minimal',
    content: {
      name: 'Benedicta Kamau',
      role: 'Social Media Manager & Content Strategist',
      headline: 'Helping brands show up consistently, sound human, and turn followers into customers.',
      about: 'Five years building social presence for consumer brands across East Africa and the diaspora. I started as a copywriter, moved into community management, and now lead end-to-end campaigns from strategy to publishing to reporting.\n\nI care about the numbers but I care more about the story behind them — why an audience engages, what makes them stay, and what turns a casual follower into a loyal customer.',
      location: 'Nairobi, Kenya',
      email: 'benedicta@example.com',
      github_url: '',
      linkedin_url: 'https://linkedin.com/in/benedictawanjiku',
      avatar_url: '',
      skills: ['Instagram', 'TikTok', 'Content Strategy', 'Copywriting', 'Canva', 'Hootsuite', 'Analytics', 'Community Management', 'Brand Voice', 'Paid Social'],
      skills_narrative: 'Strategy first, execution second — every post has a purpose behind it.',
      skills_grouped: [
        { category: 'Platforms', items: ['Instagram', 'TikTok', 'LinkedIn', 'Twitter/X', 'Facebook'] },
        { category: 'Content', items: ['Copywriting', 'Canva', 'CapCut', 'Notion', 'Brand Voice'] },
        { category: 'Growth & Analytics', items: ['Meta Business Suite', 'Hootsuite', 'Google Analytics', 'Paid Social'] },
      ],
      projects: [
        {
          title: 'Zuri Skincare — Brand Launch Campaign',
          problem: 'A Nairobi skincare startup had a great product but zero social presence and a launch date 6 weeks away.',
          solution: 'Built the brand voice from scratch, designed a 6-week content calendar across Instagram and TikTok, and ran a micro-influencer seeding campaign with 12 Kenyan creators.',
          outcome: 'Reached 180,000 accounts in launch week. 4,200 new followers. First product batch sold out in 9 days.',
          stack: ['Instagram', 'TikTok', 'Canva', 'Hootsuite', 'Influencer Outreach'],
          url: '',
          image_url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=640&h=360&fit=crop',
        },
        {
          title: 'Greenleaf Foods — Community Relaunch',
          problem: 'An established food brand had a stagnant Instagram of 22k followers with under 0.5% engagement and a feed that looked outdated.',
          solution: 'Audited 12 months of content, repositioned the brand tone from corporate to warm and local, introduced a weekly recipe series and UGC repost programme.',
          outcome: 'Engagement rate rose from 0.4% to 3.8% in 3 months. 6,200 new followers. UGC programme generated 400+ tagged posts.',
          stack: ['Instagram', 'Meta Business Suite', 'Canva', 'Community Management'],
          url: '',
          image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=640&h=360&fit=crop',
        },
        {
          title: 'AfroFit App — TikTok Growth',
          problem: 'A fitness app targeting young Africans had no TikTok presence despite their audience spending hours on the platform daily.',
          solution: 'Launched the TikTok account, developed a content mix of workout snippets, creator collabs, and culturally relevant trending sounds. Posted 5 times per week for 10 weeks.',
          outcome: 'Grew from 0 to 14,000 TikTok followers in 10 weeks. Two videos crossed 200,000 views organically.',
          stack: ['TikTok', 'CapCut', 'Trend Research', 'Creator Partnerships'],
          url: '',
          image_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=640&h=360&fit=crop',
        },
        {
          title: 'Kazi Collective — LinkedIn Thought Leadership',
          problem: 'A pan-African professional community had 800 LinkedIn followers and zero organic reach despite having strong founding members with real stories to tell.',
          solution: 'Built a 90-day content strategy around founder voices, member spotlights, and data-driven posts on African remote work trends. Ghost-wrote weekly long-form posts for 3 founders and ran a newsletter cross-promotion series.',
          outcome: 'Grew from 800 to 11,400 LinkedIn followers in 90 days. Two posts crossed 50,000 impressions organically. Newsletter subscribers up 340%.',
          stack: ['LinkedIn', 'Notion', 'Copywriting', 'Newsletter Strategy', 'Ghost-writing'],
          url: '',
          image_url: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=640&h=360&fit=crop',
        },
      ],
      experience: [
        {
          company: 'Sema Digital Agency',
          role: 'Senior Social Media Manager',
          period: '2023 – Present',
          bullets: [
            'Manage social strategy for 6 active client accounts across FMCG, health, and lifestyle sectors',
            'Lead a team of 2 junior content creators and 1 paid social specialist',
            'Grew combined client following by 84,000 in 18 months',
          ],
        },
        {
          company: 'Jumia Kenya',
          role: 'Social Media Executive',
          period: '2021 – 2023',
          bullets: [
            'Managed Instagram, Facebook, and Twitter for one of East Africa\'s largest e-commerce platforms',
            'Co-created the Black Friday 2022 social campaign that drove 23% higher click-through than the previous year',
            'Handled real-time community management during peak sale periods',
          ],
        },
      ],
    },
  },
  ezekwe: {
    template: 'creative',
    content: {
      name: 'Ezekwe Nwanna',
      role: 'AI/ML Engineer · Electronics Engineer',
      headline: 'I design and deploy AI systems that solve real operational problems. From banking intelligence platforms, AI agents, embedded IoT products, and production SaaS.',
      about: 'AI systems engineer with a background in electronics and a track record of shipping production systems across banking, fintech, and IoT. Currently at Wema Bank building ML pipelines and conversational AI platforms on Azure.\n\nI care about systems that actually run in production — not demos. Every project here has real users, real revenue, or real operational impact.',
      location: 'Lagos, Nigeria · Available Remote · USD/EUR',
      email: 'nwannachumaclifford@gmail.com',
      github_url: 'https://github.com/cliffordnwanna',
      linkedin_url: 'https://linkedin.com/in/cliffordnwanna',
      avatar_url: '',
      skills: ['LangChain', 'Azure OpenAI', 'GPT-4o', 'Python', 'FastAPI', 'Next.js 15', 'TypeScript', 'Supabase', 'Azure ML', 'ESP32', 'Docker', 'Paystack'],
      skills_narrative: 'Full-stack AI: from prompt engineering and vector search to embedded hardware and production SaaS.',
      skills_grouped: [
        { category: 'AI / LLM', items: ['LangChain', 'Azure OpenAI', 'GPT-4o / mini', 'RAG Pipelines', 'pgvector', 'AI Agents', 'Prompt Engineering', 'Embeddings'] },
        { category: 'Backend & Data', items: ['Python', 'FastAPI', 'Flask', 'SQL / T-SQL', 'PostgreSQL', 'Supabase', 'Scikit-learn', 'Pandas'] },
        { category: 'Frontend & Cloud', items: ['Next.js 15', 'TypeScript', 'React', 'Azure ML', 'Azure Synapse', 'Docker', 'GitHub Actions', 'PM2'] },
        { category: 'Hardware & SaaS', items: ['ESP32', 'Arduino', 'BLE', 'RFID', 'Embedded C', 'Paystack', 'Resend', 'IoT SaaS'] },
      ],
      projects: [
        {
          title: 'UpJobs.co — AI Job Matching Platform',
          problem: 'African tech professionals applying to 50+ irrelevant roles manually with no targeting.',
          solution: 'Solo-built Next.js platform ingesting 9,000+ remote jobs daily via hybrid pgvector semantic search and GPT-4o-mini match reasoning, delivering results to WhatsApp.',
          outcome: 'Live product with paying users. 85% reduction in irrelevant applications reported.',
          stack: ['Next.js 15', 'Supabase', 'pgvector', 'OpenAI', 'Paystack'],
          url: 'https://upjobs.co',
        },
        {
          title: 'CRIS — Corporate Retention Intelligence System',
          problem: 'Bank losing high-value corporate accounts with no early warning or intervention system.',
          solution: '1,069-line Python/SQL churn pipeline on Azure ML scoring 320,000+ corporate accounts monthly using random forest with 89% recall.',
          outcome: '₦295B at-risk identified. ₦191.5B turnover reactivated in first quarter.',
          stack: ['Python', 'Azure ML', 'T-SQL', 'Scikit-learn'],
          url: '',
        },
        {
          title: 'liveportfolio.site — AI Portfolio Builder',
          problem: 'African tech professionals with strong experience but no professional online presence to show recruiters.',
          solution: 'Solo-built SaaS that turns a 4-step form into a full portfolio website using GPT-4o-mini — generates polished copy, three designer templates, and publishes permanently at yourname.liveportfolio.site.',
          outcome: 'Live product. First users onboarded. Built and deployed in under 30 days.',
          stack: ['Next.js 15', 'Supabase', 'OpenAI', 'Paystack', 'Resend'],
          url: 'https://liveportfolio.site',
        },
        {
          title: 'Data Knight V2 — NL to SQL Analytics',
          problem: 'Business analysts spending 4+ hours daily writing SQL reports on Azure Synapse.',
          solution: 'Governed natural language to SQL platform using Semantic Firewall Architecture. Intent classification routes queries to pre-approved templates. 39/39 agent tests passing.',
          outcome: 'Report turnaround reduced from 4 hours to under 2 minutes for 200+ users.',
          stack: ['FastAPI', 'Azure OpenAI', 'Azure Synapse', 'Chart.js'],
          url: '',
        },
        {
          title: 'Finance Intelligence System',
          problem: 'People upload bank statements to spreadsheets and still have no idea where their money is going.',
          solution: 'GPT-powered Streamlit app with a strict separation between a deterministic statistical pipeline and LLM narration. Upload a CSV, get instant category breakdowns, trend analysis, and a finance assistant that only narrates real numbers — never invents them. Full responsible AI governance layer including prompt injection detection, rate limiting, and audit logging.',
          outcome: '100 tests passing. Live on Hugging Face Spaces. MIT open source.',
          stack: ['Python', 'Streamlit', 'OpenAI GPT-4o-mini', 'Pandas', 'Plotly'],
          url: 'https://huggingface.co/spaces/cliffordnwanna/finance-intelligence',
        },
      ],
      experience: [
        {
          company: 'Wema Bank Plc',
          role: 'Data Scientist / AI Engineer',
          period: 'Mar 2025 – Present',
          bullets: [
            'Built CRIS churn pipeline — 320k+ accounts scored monthly, ₦295B identified, ₦191.5B reactivated in first quarter',
            'Designed Semantic Firewall Architecture for Data Knight — governed NL→SQL on Azure Synapse',
            'Built Streak AI — LangChain + Azure OpenAI agent for relationship managers with RLS enforcement',
            'Authored AI productivity guide for internal Data Digest publication (50+ RM audience)',
          ],
        },
        {
          company: 'JéGO Technologies',
          role: 'AI/ML Engineer (Contract)',
          period: 'Jan 2025 – Mar 2025',
          bullets: [
            'ML models for EV route optimisation and energy consumption prediction',
            'Distributed Agile delivery across time zones',
          ],
        },
        {
          company: 'Ecotronics Enterprise',
          role: 'Founder & Solutions Engineer',
          period: '2021 – Present',
          bullets: [
            'UpJobs.co — live AI job platform, solo-built, paying users',
            'liveportfolio.site — AI portfolio builder, solo-built, live product',
            'Gateman — BLE attendance SaaS (registered business, first client)',
            'INKLIENT — CNC pen plotter signing machine (Flask + G-code, near-production)',
          ],
        },
      ],
    },
  },
  emeka: {
    template: 'bold',
    content: {
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
    },
  },
}

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: rawSlug } = await params
  const slug = rawSlug.toLowerCase()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://liveportfolio.site'

  if (DEMO_PORTFOLIOS[slug]) {
    const { content } = DEMO_PORTFOLIOS[slug]
    return {
      title: `${content.name} — ${content.role}`,
      description: content.headline,
      alternates: { canonical: `${appUrl}/${slug}` },
    }
  }

  const supabaseAdmin = getSupabaseAdmin()

  const { data } = await supabaseAdmin
    .from('users')
    .select('portfolios(seo_title, seo_description, og_image_url)')
    .eq('slug', slug)
    .neq('plan', 'unpublished')
    .single()

  const rawPortfolio = data?.portfolios
  const portfolio = (Array.isArray(rawPortfolio)
    ? (rawPortfolio as unknown as { seo_title: string; seo_description: string; og_image_url: string }[])[0]
    : rawPortfolio as unknown as { seo_title: string; seo_description: string; og_image_url: string } | null) ?? null

  if (!portfolio) return {}

  const canonicalUrl = `${appUrl}/${slug}`
  return {
    title: portfolio.seo_title,
    description: portfolio.seo_description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: portfolio.seo_title,
      description: portfolio.seo_description,
      images: portfolio.og_image_url
        ? [portfolio.og_image_url]
        : [`${appUrl}/logo-1024.png`],
      url: canonicalUrl,
      type: 'profile',
      siteName: 'liveportfolio.site',
    },
    twitter: {
      card: 'summary_large_image',
      title: portfolio.seo_title,
      description: portfolio.seo_description,
      images: portfolio.og_image_url
        ? [portfolio.og_image_url]
        : [`${appUrl}/logo-1024.png`],
    },
  }
}

export default async function PortfolioPage({ params }: Props) {
  const { slug: rawSlug } = await params
  const slug = rawSlug.toLowerCase()

  if (DEMO_PORTFOLIOS[slug]) {
    const { template, content } = DEMO_PORTFOLIOS[slug]
    return (
      <>
        <DemoToggle content={content} defaultTemplate={template} />
        <AcquisitionBar />
      </>
    )
  }

  const supabaseAdmin = getSupabaseAdmin()

  // supabaseAdmin bypasses RLS — required for public portfolio rendering
  const { data, error } = await supabaseAdmin
    .from('users')
    .select(`
      slug,
      plan,
      portfolios(id, template, content)
    `)
    .eq('slug', slug)
    .neq('plan', 'unpublished')
    .single()

  if (error || !data) {
    notFound()
  }

  // Supabase returns related rows as an array — unwrap the first element
  const portfolioRow = Array.isArray(data.portfolios)
    ? (data.portfolios as unknown as { id: string; template: string; content: PortfolioContent }[])[0]
    : (data.portfolios as unknown as { id: string; template: string; content: PortfolioContent } | null)

  if (!portfolioRow?.content) {
    notFound()
  }

  const portfolio = portfolioRow

  // Fire-and-forget: record portfolio_view event with company/country enrichment.
  // Does not block render. Uses server-side headers — raw IP never stored.
  // Skip demo/showcase slugs to prevent slideshow traffic inflating analytics.
  if (!DEMO_SLUGS.has(slug)) {
    const headersList = await headers()
    const rawIp = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
      || headersList.get('x-real-ip')
      || 'unknown'
    const referrer = headersList.get('referer') || null
    const ipHash = createHash('sha256').update(rawIp).digest('hex').slice(0, 16)

    getIpInfo(rawIp, ipHash, supabaseAdmin).then(({ company, country }) => {
      void Promise.resolve(
        supabaseAdmin.from('analytics_events').insert({
          portfolio_id: portfolio.id,
          event_type: 'portfolio_view',
          referrer,
          ip_hash: ipHash,
          company,
          country,
        })
      )
    }).catch(() => {})
  }

  const TEMPLATE_MAP: Record<string, React.ComponentType<{ content: PortfolioContent }>> = {
    minimal: Minimal,
    bold: Bold,
    creative: Creative,
    developer: Developer,
    designer: Designer,
    'data-scientist': DataScientist,
    'product-manager': ProductManager,
    finance: Finance,
    graduate: Graduate,
    cybersecurity: Cybersecurity,
  }
  const PRO_TEMPLATES = new Set(['developer', 'designer', 'data-scientist', 'product-manager', 'finance', 'graduate', 'cybersecurity'])
  // Gate Pro templates: only render if user has pro plan. Basic/free fall back to Minimal.
  // The stored template value is preserved — upgrading to Pro activates it automatically.
  const isPro = (data as { plan?: string }).plan === 'pro'
  const effectiveTemplate = (PRO_TEMPLATES.has(portfolio.template) && !isPro) ? 'minimal' : portfolio.template
  const Template = TEMPLATE_MAP[effectiveTemplate] ?? Minimal
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://liveportfolio.site'
  const c = portfolio.content

  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: c.name,
    jobTitle: c.role,
    description: c.headline,
    email: c.email,
    url: `${appUrl}/${slug}`,
    ...(c.location && { address: { '@type': 'PostalAddress', addressLocality: c.location } }),
    ...(c.github_url && { sameAs: [c.github_url, c.linkedin_url].filter(Boolean) }),
    ...(c.avatar_url && { image: c.avatar_url }),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
      <Template content={portfolio.content} />
      <ClientAnalytics slug={slug} />
      <AcquisitionBar />
    </>
  )
}
