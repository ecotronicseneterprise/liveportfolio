'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import Logo from '@/components/Logo'

interface Project {
  title: string
  description: string
  stack: string
  url: string
  imageFile: File | null
  image_preview: string
}

interface Experience {
  company: string
  role: string
  period: string
  bullets: string
}

interface FormData {
  name: string
  role: string
  email: string
  location: string
  bio: string
  github_url: string
  linkedin_url: string
  avatar_url: string
  avatarFile: File | null
  projects: Project[]
  template: 'minimal' | 'bold' | 'creative'
  slug: string
  password: string
  agreeTerms: boolean
  experience: Experience[]
}

const STEPS = ['Your Basics', 'Projects', 'Template', 'Claim Your URL']

const GENERATION_LABELS = [
  'Parsing your information…',
  'Writing your story…',
  'Crafting your case studies…',
  'Finalising your portfolio…',
]

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">Step {step} of {total}</span>
        <span className="text-sm font-medium text-gray-700">{STEPS[step - 1]}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#0A66C2] rounded-full transition-all duration-500"
          style={{ width: `${(step / total) * 100}%` }}
        />
      </div>
    </div>
  )
}

export default function CreatePage() {
  const router = useRouter()
  let supabase: ReturnType<typeof getSupabaseClient>
  try {
    supabase = getSupabaseClient()
  } catch {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="max-w-lg w-full bg-white border border-gray-100 rounded-2xl p-6">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Setup required</h1>
          <p className="text-sm text-gray-600">
            Supabase env vars are missing. Set <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
            <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> on your deployment, then reload.
          </p>
        </div>
      </div>
    )
  }
  // Redirect to preview if user already has a portfolio
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const { data: portfolio } = await supabase
        .from('portfolios')
        .select('id')
        .eq('user_id', session.user.id)
        .single()
      if (portfolio && 'id' in portfolio) router.replace(`/preview/${(portfolio as { id: string }).id}`)
    })
  }, [router])

  const [step, setStep] = useState(1)
  const [generating, setGenerating] = useState(false)
  const [generationStep, setGenerationStep] = useState(0)
  const [error, setError] = useState('')
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [slugSuggestion, setSlugSuggestion] = useState('')
  const [uploadingCv, setUploadingCv] = useState(false)
  const [slugTimer, setSlugTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [showAccountForm, setShowAccountForm] = useState(false)

  const [form, setForm] = useState<FormData>({
    name: '', role: '', email: '', location: '', bio: '',
    github_url: '', linkedin_url: '', avatar_url: '', avatarFile: null,
    projects: [{ title: '', description: '', stack: '', url: '', imageFile: null, image_preview: '' }],
    template: 'minimal',
    slug: '', password: '', agreeTerms: false,
    experience: [],
  })

  const update = (field: keyof FormData, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError('')
  }

  // CV Upload
  const handleCvUpload = async (file: File) => {
    setUploadingCv(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/parse-cv', { method: 'POST', body: fd })
      const data = await res.json()

      if (data.name) update('name', data.name)
      if (data.role) update('role', data.role)
      if (data.email) update('email', data.email)
      if (data.location) update('location', data.location)
      if (data.bio) update('bio', data.bio.slice(0, 500))
      if (data.github_url) update('github_url', data.github_url.slice(0, 200))
      if (data.linkedin_url) update('linkedin_url', data.linkedin_url.slice(0, 200))
      if (data.projects?.length) {
        update('projects', data.projects.slice(0, 4).map((p: { title?: string; description?: string; stack?: string[] }) => ({
          title: p.title || '',
          description: p.description || '',
          stack: (p.stack || []).join(', '),
          url: '',
        })))
      }
      if (data.experience?.length) {
        update('experience', data.experience.map((e: { company?: string; role?: string; period?: string; bullets?: string[] }) => ({
          company: e.company || '',
          role: e.role || '',
          period: e.period || '',
          bullets: (e.bullets || []).join('\n'),
        })))
      }
    } catch {
      // Silent fail — CV parsing is optional
    } finally {
      setUploadingCv(false)
    }
  }

  // Avatar Upload
  const handleAvatarChange = async (file: File) => {
    if (!file.type.startsWith('image/')) return
    if (file.size > 2 * 1024 * 1024) {
      setError('Photo must be under 2MB')
      return
    }
    update('avatarFile', file)
    const url = URL.createObjectURL(file)
    update('avatar_url', url)
  }

  // Slug check with debounce
  const checkSlug = useCallback((value: string) => {
    if (slugTimer) clearTimeout(slugTimer)
    if (!value || value.length < 3) {
      setSlugStatus('idle')
      return
    }
    setSlugStatus('checking')
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/check-slug?slug=${encodeURIComponent(value)}`)
        const data = await res.json()
        setSlugStatus(data.available ? 'available' : 'taken')
        if (data.suggestion) setSlugSuggestion(data.suggestion)
      } catch {
        setSlugStatus('idle')
      }
    }, 500)
    setSlugTimer(timer)
  }, [slugTimer])

  const updateProject = (index: number, field: keyof Project, value: string) => {
    const updated = [...form.projects]
    updated[index] = { ...updated[index], [field]: value }
    update('projects', updated)
  }

  const addProject = () => {
    if (form.projects.length < 4) {
      update('projects', [...form.projects, { title: '', description: '', stack: '', url: '', imageFile: null, image_preview: '' }])
    }
  }

  const handleProjectImageChange = (index: number, file: File) => {
    if (!file.type.startsWith('image/')) return
    if (file.size > 3 * 1024 * 1024) {
      setError('Project image must be under 3MB')
      return
    }
    const preview = URL.createObjectURL(file)
    const updated = [...form.projects]
    updated[index] = { ...updated[index], imageFile: file, image_preview: preview }
    update('projects', updated)
  }

  const removeProject = (index: number) => {
    if (form.projects.length > 1) {
      update('projects', form.projects.filter((_, i) => i !== index))
    }
  }

  // Validation per step
  const validateStep = (): string => {
    if (step === 1) {
      if (!form.name.trim()) return 'Name is required'
      if (!form.role.trim()) return 'Professional title is required'
      if (!form.email.trim() || !form.email.includes('@')) return 'Valid email is required'
    }
    if (step === 2) {
      const hasProjects = form.projects.some((p) => p.title.trim())
      const hasGithub = form.github_url.trim()
      if (!hasProjects && !hasGithub) return 'Add at least one project, or enter your GitHub URL in Step 1'
      if (form.projects.some((p) => p.title.trim() === '' && p.description.trim() !== '')) return 'Projects with a description need a title'
    }
    if (step === 4) {
      if (!form.slug.trim()) return 'Please choose a URL slug'
      if (slugStatus !== 'available') return 'Please choose an available slug'
      if (showAccountForm) {
        if (!form.password || form.password.length < 8) return 'Password must be at least 8 characters'
        if (!form.agreeTerms) return 'Please agree to the terms'
      }
    }
    return ''
  }

  const handleNext = () => {
    const err = validateStep()
    if (err) { setError(err); return }
    setStep((s) => s + 1)
    window.scrollTo(0, 0)
  }

  // Final submit: create account + generate portfolio
  const handleSubmit = async () => {
    const err = validateStep()
    if (err) { setError(err); return }

    setGenerating(true)
    setError('')

    // Animate generation labels
    let labelIndex = 0
    const labelInterval = setInterval(() => {
      labelIndex = Math.min(labelIndex + 1, GENERATION_LABELS.length - 1)
      setGenerationStep(labelIndex)
    }, 1800)

    try {
      // 1. Sign up with Supabase
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      })

      if (signUpError) throw new Error(signUpError.message)
      if (!authData.session) throw new Error('Check your email for a verification link, then come back to generate your portfolio. (To skip this: Supabase → Authentication → Providers → Email → disable "Confirm email")')

      // 2. Create user record with slug (must be unique)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any
      const { error: userError } = await sb
        .from('users')
        .insert({ id: authData.user!.id, email: form.email, slug: form.slug })

      if (userError) {
        // Race-safe handling:
        // - If the user row already exists for this auth user, continue.
        // - If slug is taken by someone else, stop and ask for a new slug.
        const { data: existingUser } = await sb
          .from('users')
          .select('id, slug')
          .eq('id', authData.user!.id)
          .single()

        if (!existingUser) {
          const message = (userError.message || '').toLowerCase()
          const isDuplicate = message.includes('duplicate') || message.includes('unique')
          if (isDuplicate) {
            throw new Error('That username is already taken. Please choose another one.')
          }
          throw new Error('Failed to save user profile')
        }
      }

      // 3. Upload project images if provided
      const projectImageUrls: (string | null)[] = await Promise.all(
        form.projects.map(async (p, i) => {
          if (!p.imageFile) return null
          const ext = p.imageFile.type === 'image/png' ? 'png' : p.imageFile.type === 'image/webp' ? 'webp' : 'jpg'
          const path = `project-images/${authData.user!.id}-${i}.${ext}`
          const { error: uploadError } = await supabase.storage
            .from('project-images')
            .upload(path, p.imageFile, { upsert: true, contentType: p.imageFile.type })
          if (uploadError) return null
          const { data: publicData } = supabase.storage.from('project-images').getPublicUrl(path)
          return publicData.publicUrl
        })
      )

      // 4. Upload avatar if provided
      let avatarUrl: string | undefined
      if (form.avatarFile) {
        const ext = form.avatarFile.type === 'image/png' ? 'png' : 'jpg'
        const path = `avatars/${authData.user!.id}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, form.avatarFile, { upsert: true, contentType: form.avatarFile.type })

        if (!uploadError) {
          const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(path)
          avatarUrl = publicData.publicUrl
        }
      }

      // 5. Generate portfolio
      const generatePayload = {
        name: form.name,
        role: form.role,
        bio: form.bio,
        location: form.location,
        email: form.email,
        github_url: form.github_url || undefined,
        linkedin_url: form.linkedin_url || undefined,
        avatar_url: avatarUrl,
        skills: form.projects.flatMap((p) =>
          p.stack.split(',').map((s) => s.trim()).filter(Boolean)
        ).slice(0, 15),
        projects: form.projects.map((p, i) => ({
          title: p.title,
          description: p.description,
          stack: p.stack.split(',').map((s) => s.trim()).filter(Boolean),
          url: p.url || undefined,
          image_url: projectImageUrls[i] || undefined,
        })),
        experience: form.experience.map((e) => ({
          company: e.company,
          role: e.role,
          period: e.period,
          bullets: e.bullets.split('\n').filter(Boolean),
        })),
        template: form.template,
      }

      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authData.session.access_token}`,
        },
        body: JSON.stringify(generatePayload),
      })

      const genData = await genRes.json()

      if (!genData.portfolio_id) throw new Error('Generation failed — please try again')

      clearInterval(labelInterval)
      router.push(`/preview/${genData.portfolio_id}`)
    } catch (err) {
      clearInterval(labelInterval)
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setGenerating(false)
    }
  }

  // Generation screen
  if (generating) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 border-4 border-[#0A66C2] border-t-transparent rounded-full animate-spin mx-auto mb-8" />
          <div className="space-y-2">
            {GENERATION_LABELS.map((label, i) => (
              <p
                key={i}
                className={`text-sm transition-all duration-500 ${
                  i === generationStep
                    ? 'text-[#0A66C2] font-medium opacity-100'
                    : i < generationStep
                    ? 'text-gray-300 opacity-50 line-through'
                    : 'text-gray-300 opacity-50'
                }`}
              >
                {i < generationStep ? '✓ ' : i === generationStep ? '→ ' : '  '}{label}
              </p>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-8">
          <a href="/">
            <Logo />
          </a>
        </div>

        <ProgressBar step={step} total={4} />

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Step 1: Basics */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Your basics</h1>
              <p className="text-gray-500 text-sm">Tell us who you are. AI will write the rest.</p>
            </div>

            {/* CV Upload */}
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-[#0A66C2] transition-colors">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleCvUpload(e.target.files[0])}
                />
                {uploadingCv ? (
                  <div className="flex items-center justify-center gap-2 text-[#0A66C2]">
                    <div className="w-4 h-4 border-2 border-[#0A66C2] border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Reading your CV…</span>
                  </div>
                ) : (
                  <>
                    <svg className="mb-2" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10 9 9 9 8 9"/>
                    </svg>
                    <p className="text-sm font-medium text-gray-700">Upload your CV (optional)</p>
                    <p className="text-xs text-gray-400 mt-1">PDF, max 5MB — auto-fills the form</p>
                  </>
                )}
              </label>
            </div>

            {/* Avatar */}
            <div className="flex items-center gap-4">
              <label className="cursor-pointer flex-shrink-0">
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleAvatarChange(e.target.files[0])}
                />
                <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-dashed border-gray-200 hover:border-[#0A66C2] flex items-center justify-center overflow-hidden transition-colors">
                  {form.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  )}
                </div>
              </label>
              <div>
                <p className="text-sm font-medium text-gray-700">Profile photo</p>
                <p className="text-xs text-gray-400">Optional · JPEG/PNG · max 2MB</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value.slice(0, 80))}
                  placeholder="Adaeze Okonkwo"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Professional title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.role}
                  onChange={(e) => update('role', e.target.value.slice(0, 80))}
                  placeholder="Data Scientist"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value.slice(0, 120))}
                  placeholder="adaeze@gmail.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">City, Country</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => update('location', e.target.value.slice(0, 80))}
                  placeholder="Lagos, Nigeria"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Short bio
                  <span className="text-gray-400 font-normal"> — AI rewrites this, so keep it raw and real</span>
                </label>
                <textarea
                  value={form.bio}
                  onChange={(e) => update('bio', e.target.value.slice(0, 500))}
                  placeholder="I'm a data scientist with 3 years of experience building analytics pipelines and ML models for fintech companies…"
                  rows={4}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{form.bio.length}/500</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GitHub URL</label>
                <input
                  type="url"
                  value={form.github_url}
                  onChange={(e) => update('github_url', e.target.value.slice(0, 200))}
                  placeholder="https://github.com/..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
                <input
                  type="url"
                  value={form.linkedin_url}
                  onChange={(e) => update('linkedin_url', e.target.value.slice(0, 200))}
                  placeholder="https://linkedin.com/in/..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Projects */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Your projects</h1>
              <p className="text-gray-500 text-sm">Add 1–4 projects. Keep descriptions short — AI expands them into case studies.</p>
              {form.github_url && form.projects.every((p) => !p.title.trim()) && (
                <p className="text-xs text-[#0A66C2] mt-2 bg-[#E8F0F9] px-3 py-2 rounded-lg">
                  You have a GitHub URL — you can skip projects and AI will work from your bio and role. Or add projects for a stronger portfolio.
                </p>
              )}
            </div>

            {form.projects.map((project, i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Project {i + 1}</span>
                  {form.projects.length > 1 && (
                    <button
                      onClick={() => removeProject(i)}
                      className="text-xs text-gray-400 hover:text-red-400 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={project.title}
                    onChange={(e) => updateProject(i, 'title', e.target.value.slice(0, 80))}
                    placeholder="Analytics Dashboard"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    What it does
                    <span className="text-gray-400 font-normal"> — AI writes the case study (optional)</span>
                  </label>
                  <textarea
                    value={project.description}
                    onChange={(e) => updateProject(i, 'description', e.target.value.slice(0, 200))}
                    placeholder="Built a real-time sales dashboard for a fintech startup that reduced reporting time from 2 days to 30 minutes"
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">{project.description.length}/200</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tech stack</label>
                    <input
                      type="text"
                      value={project.stack}
                      onChange={(e) => updateProject(i, 'stack', e.target.value.slice(0, 150))}
                      placeholder="Python, Pandas, PostgreSQL"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Live URL</label>
                    <input
                      type="url"
                      value={project.url}
                      onChange={(e) => updateProject(i, 'url', e.target.value.slice(0, 200))}
                      placeholder="https://..."
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Screenshot
                    <span className="text-gray-400 font-normal"> — optional</span>
                  </label>
                  <label className="cursor-pointer block">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleProjectImageChange(i, e.target.files[0])}
                    />
                    {project.image_preview ? (
                      <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={project.image_preview} alt="Project preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                          <span className="text-white text-xs font-medium">Change image</span>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-200 rounded-xl p-3 text-center hover:border-[#0A66C2] transition-colors">
                        <p className="text-xs text-gray-400">Add a screenshot · JPEG/PNG/WebP · max 3MB</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            ))}

            {form.projects.length < 4 && (
              <button
                onClick={addProject}
                className="w-full border-2 border-dashed border-gray-200 rounded-xl py-4 text-sm text-gray-400 hover:border-[#0A66C2] hover:text-[#0A66C2] transition-colors"
              >
                + Add another project
              </button>
            )}
          </div>
        )}

        {/* Step 3: Template */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Choose your template</h1>
              <p className="text-gray-500 text-sm">You can switch templates anytime after generating.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  id: 'minimal' as const,
                  name: 'Minimal',
                  desc: 'Editorial minimalism. Clean, professional, trusted.',
                  preview: (
                    <div className="bg-white border border-gray-100 rounded-lg p-3 h-32 flex flex-col gap-2">
                      <div className="flex gap-2 items-center">
                        <div className="w-6 h-6 rounded-full bg-gray-100" />
                        <div className="flex-1">
                          <div className="h-2 bg-gray-800 rounded w-2/3 mb-1" />
                          <div className="h-1.5 bg-gray-300 rounded w-1/2" />
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded w-full" />
                      <div className="h-1.5 bg-gray-100 rounded w-4/5" />
                      <div className="flex gap-1 mt-1">
                        {['React', 'Python', 'SQL'].map((t) => (
                          <span key={t} className="text-[8px] px-1.5 py-0.5 bg-gray-50 border border-gray-100 rounded-full text-gray-500">{t}</span>
                        ))}
                      </div>
                    </div>
                  ),
                },
                {
                  id: 'bold' as const,
                  name: 'Bold',
                  desc: 'Dark engineering showcase. Built for developers.',
                  preview: (
                    <div className="bg-[#0D1117] border border-[#30363D] rounded-lg p-3 h-32 flex gap-2">
                      <div className="w-14 flex-shrink-0 flex flex-col gap-1.5 border-r border-[#1C2128] pr-2">
                        <div className="h-2 bg-[#58A6FF] rounded w-full" />
                        {['About', 'Work', 'Contact'].map((t) => (
                          <div key={t} className="h-1.5 bg-[#1C2128] rounded w-full" />
                        ))}
                      </div>
                      <div className="flex-1 flex flex-col gap-1.5">
                        <div className="h-2 bg-[#F0F6FF] rounded w-3/4" />
                        <div className="h-1.5 bg-[#8B949E] rounded w-full" />
                        <div className="h-1.5 bg-[#8B949E] rounded w-2/3" />
                        <div className="mt-1 bg-[#1C2128] border-l-2 border-[#58A6FF] rounded p-1">
                          <div className="h-1.5 bg-[#58A6FF] rounded w-1/2" />
                        </div>
                      </div>
                    </div>
                  ),
                },
                {
                  id: 'creative' as const,
                  name: 'Creative',
                  desc: 'Warm editorial grid. Distinctive type, structured layout.',
                  preview: (
                    <div className="bg-[#f5f2eb] border border-[#d4cfc2] rounded-lg p-3 h-32 flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="h-3 bg-[#0d0d0d] rounded w-20 mb-1" style={{ borderRadius: 0 }} />
                          <div className="h-1.5 bg-[#d4cfc2] rounded w-24" style={{ borderRadius: 0 }} />
                        </div>
                        <div className="h-1.5 bg-[#c8401a] rounded w-10" style={{ borderRadius: 0 }} />
                      </div>
                      <div className="border-t border-[#d4cfc2] pt-2 flex gap-2">
                        <div className="flex-1 flex flex-col gap-1">
                          <div className="h-2 bg-[#7a7060] rounded w-full" style={{ borderRadius: 0 }} />
                          <div className="h-1.5 bg-[#d4cfc2] rounded w-3/4" style={{ borderRadius: 0 }} />
                        </div>
                        <div className="w-12 flex flex-col gap-1">
                          <div className="h-3 bg-[#c8401a] rounded w-full" style={{ borderRadius: 0 }} />
                          <div className="h-1.5 bg-[#d4cfc2] rounded w-full" style={{ borderRadius: 0 }} />
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {['AI', 'Python', 'SaaS'].map((t) => (
                          <span key={t} className="text-[7px] px-1.5 py-0.5 border border-[#d4cfc2] text-[#7a7060]" style={{ borderRadius: 0 }}>{t}</span>
                        ))}
                      </div>
                    </div>
                  ),
                },
              ].map((t) => (
                <div
                  key={t.id}
                  onClick={() => update('template', t.id)}
                  className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                    form.template === t.id
                      ? 'border-[#0A66C2] shadow-sm'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="mb-3">{t.preview}</div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{t.desc}</p>
                    </div>
                    {form.template === t.id && (
                      <div className="w-5 h-5 bg-[#0A66C2] rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Claim URL */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Claim your URL</h1>
              <p className="text-gray-500 text-sm">Your portfolio will live here permanently after publishing.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your portfolio URL</label>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#0A66C2]">
                <span className="px-4 py-3 text-sm text-gray-400 bg-gray-50 border-r border-gray-200 flex-shrink-0">
                  yourname
                </span>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => {
                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30)
                    update('slug', val)
                    checkSlug(val)
                  }}
                  placeholder="adaeze"
                  className="flex-1 px-3 py-3 text-sm focus:outline-none"
                />
                <span className="px-4 py-3 text-sm text-gray-400 bg-gray-50 border-l border-gray-200 flex-shrink-0">
                  .liveportfolio.site
                </span>
              </div>

              {form.slug.length >= 3 && (
                <div className="mt-2">
                  {slugStatus === 'checking' && (
                    <p className="text-xs text-gray-400">Checking availability…</p>
                  )}
                  {slugStatus === 'available' && (
                    <p className="text-xs text-[#0A66C2] font-medium">
                      ✓ {form.slug}.liveportfolio.site is available
                    </p>
                  )}
                  {slugStatus === 'taken' && (
                    <div>
                      <p className="text-xs text-red-500">✗ That URL is taken</p>
                      {slugSuggestion && (
                        <button
                          onClick={() => { update('slug', slugSuggestion); checkSlug(slugSuggestion) }}
                          className="text-xs text-[#0A66C2] hover:underline mt-0.5"
                        >
                          Try {slugSuggestion}.liveportfolio.site instead →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Account creation — appears after clicking Generate */}
            {showAccountForm && (
              <div className="border border-gray-100 rounded-xl p-5 space-y-4 bg-gray-50">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 mb-1">Create your account</h2>
                  <p className="text-xs text-gray-400">Your portfolio will be saved to this account.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    disabled
                    className="w-full border border-gray-100 rounded-xl px-4 py-3 text-sm bg-white text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => update('password', e.target.value)}
                    placeholder="Min 8 characters"
                    autoFocus
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent bg-white"
                  />
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.agreeTerms}
                    onChange={(e) => update('agreeTerms', e.target.checked)}
                    className="mt-0.5 accent-[#0A66C2]"
                  />
                  <span className="text-sm text-gray-500">
                    I agree to the{' '}
                    <a href="/terms" className="text-[#0A66C2] hover:underline">terms of service</a>
                    {' '}and{' '}
                    <a href="/privacy" className="text-[#0A66C2] hover:underline">privacy policy</a>
                  </span>
                </label>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
          {step > 1 ? (
            <button
              onClick={() => { setStep((s) => s - 1); setError('') }}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              ← Back
            </button>
          ) : <div />}

          {step < 4 ? (
            <button
              onClick={handleNext}
              className="px-6 py-3 bg-[#0A66C2] text-white text-sm font-semibold rounded-full hover:bg-[#084D9A] transition-colors"
            >
              Continue →
            </button>
          ) : !showAccountForm ? (
            <button
              onClick={() => {
                if (!form.slug.trim()) { setError('Please choose a URL slug'); return }
                if (slugStatus !== 'available') { setError('Please choose an available slug'); return }
                setError('')
                setShowAccountForm(true)
              }}
              className="px-6 py-3 bg-[#0A66C2] text-white text-sm font-semibold rounded-full hover:bg-[#084D9A] transition-colors"
            >
              Generate my portfolio →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="px-6 py-3 bg-[#0A66C2] text-white text-sm font-semibold rounded-full hover:bg-[#084D9A] transition-colors"
            >
              Create account &amp; generate →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
