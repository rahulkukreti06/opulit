import { supabase } from './supabase'

export async function uploadToR2(file, folder = 'inventory') {
  if (!file) throw new Error('No file provided')
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Authentication required')

  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = () => reject(new Error('Could not read image'))
    reader.readAsDataURL(file)
  })

  const response = await fetch('/api/r2-storage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ file_name: file.name, content_type: file.type, base64, folder }),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Failed to upload image')
  return result.url
}

export async function deleteFromR2(imageUrl) {
  if (!imageUrl) return
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Authentication required')
  const response = await fetch('/api/r2-storage', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ image_url: imageUrl }),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Failed to delete image')
}
