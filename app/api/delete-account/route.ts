import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function DELETE(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const token = authHeader.slice(7)

  // Verify the token and get the user
  const supabaseAdmin = getSupabaseAdmin()
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Delete from storage: avatars and project images
    const { data: avatarFiles } = await supabaseAdmin.storage
      .from('avatars')
      .list('', { search: user.id })
    if (avatarFiles?.length) {
      await supabaseAdmin.storage.from('avatars').remove(avatarFiles.map(f => f.name))
    }

    const { data: projectFiles } = await supabaseAdmin.storage
      .from('project-images')
      .list('', { search: user.id })
    if (projectFiles?.length) {
      await supabaseAdmin.storage.from('project-images').remove(projectFiles.map(f => f.name))
    }

    // Delete user row (cascades to portfolios, payments via FK)
    await supabaseAdmin.from('users').delete().eq('id', user.id)

    // Delete auth user (must use service role)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    if (deleteError) throw deleteError

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('delete-account error:', err)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}
