import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getAuthenticatedUser, json, method } from '../serverless/_lib/payment.js'

function getClient() {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucket = process.env.R2_BUCKET_NAME
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error('R2 server configuration is missing')
  }
  return {
    bucket,
    publicUrl: process.env.R2_PUBLIC_URL,
    client: new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    }),
  }
}

export default async function handler(req, res) {
  if (!['POST', 'DELETE'].includes(req.method)) return method(res, ['POST', 'DELETE'])
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) return json(res, 401, { error: 'Authentication required' })
    const { bucket, publicUrl, client } = getClient()

    if (req.method === 'DELETE') {
      const imageUrl = req.body?.image_url
      if (typeof imageUrl !== 'string') return json(res, 400, { error: 'Image URL is required' })
      const url = new URL(imageUrl)
      const key = decodeURIComponent(url.pathname.replace(/^\/+/, ''))
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
      return json(res, 200, { success: true })
    }

    const { file_name: fileName, content_type: contentType, base64, folder = 'inventory' } = req.body || {}
    if (typeof fileName !== 'string' || typeof base64 !== 'string' || typeof contentType !== 'string') {
      return json(res, 400, { error: 'Missing upload fields' })
    }
    if (!/^image\/(jpeg|png|webp|gif|avif)$/.test(contentType)) {
      return json(res, 400, { error: 'Unsupported image type' })
    }
    if (base64.length > 8_000_000) return json(res, 413, { error: 'Image is too large' })

    const extension = fileName.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
    const safeFolder = /^[a-z0-9_-]+$/i.test(folder) ? folder : 'inventory'
    const key = `${safeFolder}/${Date.now()}-${cryptoRandomHex()}.${extension}`
    const body = Buffer.from(base64, 'base64')
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }))

    const accountId = process.env.R2_ACCOUNT_ID
    const url = publicUrl ? `${publicUrl.replace(/\/$/, '')}/${key}` : `https://${bucket}.${accountId}.r2.cloudflarestorage.com/${key}`
    return json(res, 200, { url })
  } catch (error) {
    console.error('r2-storage failed', { code: error?.code })
    return json(res, 500, { error: 'Could not process storage request' })
  }
}

function cryptoRandomHex() {
  return Buffer.from(globalThis.crypto?.randomUUID?.() || `${Date.now()}${Math.random()}`).toString('hex').slice(0, 16)
}
