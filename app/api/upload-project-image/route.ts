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

  // the browser shrinks images to ~200 KB; this is the ceiling for anything else, and the index goes into a storage path
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Image too large' }, { status: 413 })
  const idx = indexParam != null ? String(indexParam) : '0'
  if (!/^\d{1,2}$/.test(idx)) return NextResponse.json({ error: 'Bad index' }, { status: 400 })
  // A new name for every upload. The old name was "<user>-<position>.jpg" and was overwritten: after a project was deleted or moved, an
  // upload for one project could replace the picture another project still pointed at, and browsers kept showing the old picture.
  // The name still starts with the user id, so removing an account still finds and removes every file.
  const path = `${user.id}-${idx}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.jpg`
  const supabaseAdmin = getSupabaseAdmin()

  const { error: uploadError } = await supabaseAdmin.storage
    .from('project-images')
    .upload(path, file, { upsert: false, contentType: 'image/jpeg' })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: publicData } = supabaseAdmin.storage.from('project-images').getPublicUrl(path)

  return NextResponse.json({ url: publicData.publicUrl })
}
