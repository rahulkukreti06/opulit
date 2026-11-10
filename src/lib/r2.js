import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

const r2AccountId = import.meta.env.VITE_R2_ACCOUNT_ID
const r2AccessKeyId = import.meta.env.VITE_R2_ACCESS_KEY_ID
const r2SecretAccessKey = import.meta.env.VITE_R2_SECRET_ACCESS_KEY
const r2BucketName = import.meta.env.VITE_R2_BUCKET_NAME
const r2PublicUrl = import.meta.env.VITE_R2_PUBLIC_URL

if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey || !r2BucketName) {
  throw new Error('Missing R2 environment variables')
}

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: r2AccessKeyId,
    secretAccessKey: r2SecretAccessKey,
  },
})

export async function uploadToR2(file, folder = 'inventory') {
  if (!file) {
    throw new Error('No file provided')
  }

  const fileExtension = file.name.split('.').pop()
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`

  const fileBuffer = await file.arrayBuffer()

  const command = new PutObjectCommand({
    Bucket: r2BucketName,
    Key: fileName,
    Body: fileBuffer,
    ContentType: file.type,
  })

  try {
    await s3Client.send(command)
    
    const publicUrl = r2PublicUrl 
      ? `${r2PublicUrl}/${fileName}`
      : `https://${r2BucketName}.${r2AccountId}.r2.cloudflarestorage.com/${fileName}`
    
    return publicUrl
  } catch (error) {
    console.error('Error uploading to R2:', error)
    throw new Error(`Failed to upload image to R2: ${error.message}`)
  }
}

export async function deleteFromR2(imageUrl) {
  if (!imageUrl) {
    return
  }

  try {
    const url = new URL(imageUrl)
    const key = url.pathname.substring(1)

    const command = new DeleteObjectCommand({
      Bucket: r2BucketName,
      Key: key,
    })

    await s3Client.send(command)
  } catch (error) {
    console.error('Error deleting from R2:', error)
    throw new Error(`Failed to delete image from R2: ${error.message}`)
  }
}
