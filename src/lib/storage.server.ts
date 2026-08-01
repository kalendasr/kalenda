import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import { getStorageEnv } from '#/lib/env.server.ts'

/**
 * Bestandsopslag op Cloudflare R2 (S3-compatibel).
 *
 * Gebruikt voor coverfoto's, organisatie-branding en betaalbewijzen.
 * De client wordt lui aangemaakt zodat de app lokaal draait zonder R2-account.
 */

let client: S3Client | undefined

function getClient(): S3Client {
  if (client) return client

  const env = getStorageEnv()

  client = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  })

  return client
}

export async function uploadObject({
  key,
  body,
  contentType,
}: {
  key: string
  body: Uint8Array | string
  contentType: string
}): Promise<void> {
  const env = getStorageEnv()

  await getClient().send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  )
}

export async function deleteObject(key: string): Promise<void> {
  const env = getStorageEnv()

  await getClient().send(
    new DeleteObjectCommand({ Bucket: env.R2_BUCKET, Key: key }),
  )
}

/** Tijdelijke download-URL voor niet-publieke bestanden, zoals betaalbewijzen. */
export async function getSignedDownloadUrl(
  key: string,
  expiresInSeconds = 300,
): Promise<string> {
  const env = getStorageEnv()

  return getSignedUrl(
    getClient(),
    new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: key }),
    { expiresIn: expiresInSeconds },
  )
}

/** Publieke URL voor bestanden die iedereen mag zien, zoals coverfoto's. */
export function getPublicUrl(key: string): string {
  const env = getStorageEnv()

  return `${env.R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`
}
