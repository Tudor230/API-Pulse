import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { is_active } = body

    // Validate the channel belongs to the user
    const { data: channel, error: fetchError } = await supabase
      .from('notification_channels')
      .select('id')
      .eq('id', id)
      .single()

    if (fetchError || !channel) {
      return NextResponse.json({ error: 'Notification channel not found' }, { status: 404 })
    }

    // Update the channel
    const { data: updatedChannel, error } = await supabase
      .from('notification_channels')
      .update({ is_active })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating notification channel:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ channel: updatedChannel })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params

    // Validate the channel belongs to the user
    const { data: channel, error: fetchError } = await supabase
      .from('notification_channels')
      .select('id')
      .eq('id', id)
      .single()

    if (fetchError || !channel) {
      return NextResponse.json({ error: 'Notification channel not found' }, { status: 404 })
    }

    // Delete the channel (this will also cascade delete related alert rules)
    const { error } = await supabase
      .from('notification_channels')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting notification channel:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Notification channel deleted successfully' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 