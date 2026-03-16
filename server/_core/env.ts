export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  revenueCatApiKey: process.env.REVENUECAT_API_KEY ?? "",
  revenueCatPublishableKey: process.env.REVENUECAT_PUBLISHABLE_KEY ?? "",
  // Supabase — server-side only
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://gpfbgllazvxykxoqgopz.supabase.co",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY ?? "",
  // AWS S3 — for certificate storage
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  awsRegion: process.env.AWS_REGION ?? "us-east-1",
  awsS3Bucket: process.env.AWS_S3_BUCKET ?? "fl-greenguard-certificates",
  // OpenWeatherMap
  openWeatherApiKey: process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY ?? "",
  // OpenRouter (AI)
  openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
};
