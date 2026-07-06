import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'
import { safeJsonBody, badJson } from '@/lib/safe-json'
import { CATEGORIES, type Category } from '@/lib/types/portfolio'

const CATEGORY_VALUES = new Set(CATEGORIES.map(category => category.value))

export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await safeJsonBody<{ name?: unknown; category?: unknown; field_defaults?: unknown; guidance_prompts?: unknown }>(req)
  if (!body) return badJson()
  const name = typeof body.name === 'string' ? body.name : ''
  const category = body.category
  const field_defaults = body.field_defaults
  const guidance_prompts = body.guidance_prompts

  if (!name.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  // Every other write path validates category against CATEGORIES; a junk
  // value stored here would later make applyTemplate set a category the
  // entry form's buildPayload switch can't handle.
  if (typeof category !== 'string' || !CATEGORY_VALUES.has(category as Category)) {
    return NextResponse.json({ error: 'Category is invalid' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('templates')
    .insert({
      user_id: user.id,
      name: name.trim(),
      category: category as Category,
      field_defaults: field_defaults ?? {},
      guidance_prompts: guidance_prompts ?? {},
      is_curated: false,
    })
    .select('id')
    .single()

  if (error) {
    console.error('templates POST error:', error.message)
    return NextResponse.json({ error: 'Failed to create template. Please try again.' }, { status: 500 })
  }
  return NextResponse.json({ id: data.id }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase
    .from('templates')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('templates DELETE error:', error.message)
    return NextResponse.json({ error: 'Failed to delete template. Please try again.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await safeJsonBody<{ id?: unknown; name?: unknown }>(req)
  if (!body) return badJson()
  const id = typeof body.id === 'string' ? body.id : ''
  const name = typeof body.name === 'string' ? body.name : ''
  if (!id || !name.trim()) return NextResponse.json({ error: 'id and name required' }, { status: 400 })

  const { error } = await supabase
    .from('templates')
    .update({ name: name.trim() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('templates PATCH error:', error.message)
    return NextResponse.json({ error: 'Failed to rename template. Please try again.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
