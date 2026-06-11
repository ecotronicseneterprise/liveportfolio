import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token)

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as Blob | null
  const indexParam = formData.get('index')

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const idx = indexParam != null ? String(indexParam) : '0'
  const path = `${user.id}-${idx}.jpg`
  const supabaseAdmin = getSupabaseAdmin()

  const { error: uploadError } = await supabaseAdmin.storage
    .from('project-images')
    .upload(path, file, { upsert: true, contentType: 'image/jpeg' })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: publicData } = supabaseAdmin.storage.from('project-images').getPublicUrl(path)

  return NextResponse.json({ url: publicData.publicUrl })
}
