// S3 (MinIO-compatible) presigned URL helpers with lazy SDK import.
// pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

interface S3ClientLike {
  send(command: unknown): Promise<unknown>;
}

interface S3Module {
  S3Client: new (cfg: {
    region: string;
    endpoint?: string;
    forcePathStyle?: boolean;
    credentials: { accessKeyId: string; secretAccessKey: string };
  }) => S3ClientLike;
  PutObjectCommand: new (input: {
    Bucket: string;
    Key: string;
    ContentType?: string;
  }) => unknown;
  GetObjectCommand: new (input: { Bucket: string; Key: string }) => unknown;
}

interface PresignerModule {
  getSignedUrl(
    client: S3ClientLike,
    command: unknown,
    options?: { expiresIn?: number }
  ): Promise<string>;
}

interface S3Env {
  region: string;
  bucket: string;
  endpoint: string | undefined;
  accessKeyId: string;
  secretAccessKey: string;
}

let cachedClient: S3ClientLike | null = null;
let cachedSdk: { s3: S3Module; presigner: PresignerModule } | null = null;

function readEnv(): S3Env {
  const region = process.env.S3_REGION;
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!region || !bucket || !accessKeyId || !secretAccessKey) {
    const err = new Error(
      "Storage is not configured (missing S3_REGION/S3_BUCKET/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY)"
    );
    (err as Error & { status?: number }).status = 503;
    throw err;
  }
  return {
    region,
    bucket,
    endpoint: process.env.S3_ENDPOINT || undefined,
    accessKeyId,
    secretAccessKey,
  };
}

async function loadSdk(): Promise<{ s3: S3Module; presigner: PresignerModule }> {
  if (cachedSdk) return cachedSdk;
  try {
    // pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
    const s3ModName = "@aws-sdk/client-s3";
    const presignerModName = "@aws-sdk/s3-request-presigner";
    const s3 = (await import(/* webpackIgnore: true */ s3ModName)) as unknown as S3Module;
    const presigner = (await import(
      /* webpackIgnore: true */ presignerModName
    )) as unknown as PresignerModule;
    cachedSdk = { s3, presigner };
    return cachedSdk;
  } catch (err) {
    const message =
      "AWS S3 SDK not installed. Run: pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner";
    console.error("[storage/s3]", message, err instanceof Error ? err.message : err);
    const e = new Error(message);
    (e as Error & { status?: number }).status = 503;
    throw e;
  }
}

async function getClient(): Promise<{
  client: S3ClientLike;
  sdk: { s3: S3Module; presigner: PresignerModule };
  env: S3Env;
}> {
  const env = readEnv();
  const sdk = await loadSdk();
  if (!cachedClient) {
    cachedClient = new sdk.s3.S3Client({
      region: env.region,
      ...(env.endpoint ? { endpoint: env.endpoint, forcePathStyle: true } : {}),
      credentials: {
        accessKeyId: env.accessKeyId,
        secretAccessKey: env.secretAccessKey,
      },
    });
  }
  return { client: cachedClient, sdk, env };
}

export async function getPresignedPutUrl({
  key,
  contentType,
  expiresIn = 300,
}: {
  key: string;
  contentType: string;
  expiresIn?: number;
}): Promise<string> {
  const { client, sdk, env } = await getClient();
  const command = new sdk.s3.PutObjectCommand({
    Bucket: env.bucket,
    Key: key,
    ContentType: contentType,
  });
  return sdk.presigner.getSignedUrl(client, command, { expiresIn });
}

export async function getPresignedGetUrl({
  key,
  expiresIn = 300,
}: {
  key: string;
  expiresIn?: number;
}): Promise<string> {
  const { client, sdk, env } = await getClient();
  const command = new sdk.s3.GetObjectCommand({
    Bucket: env.bucket,
    Key: key,
  });
  return sdk.presigner.getSignedUrl(client, command, { expiresIn });
}
