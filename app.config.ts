import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";

const rawBundleId = "space.manus.fl.greenguard.t20260307054331";
const bundleId =
  rawBundleId
    .replace(/[-_]/g, ".")
    .replace(/[^a-zA-Z0-9.]/g, "")
    .replace(/\.+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .toLowerCase();

const env = {
  appName: "FL-GreenGuard",
  appSlug: "fl-greenguard",
  logoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663296226081/aDwg",
  scheme: "schemeFromBundleId",
  iosBundleId: bundleId,
  androidPackage: bundleId,
  projectId: "63d94598-ee03-99cd-b5d829ba681d",
};

const config: ExpoConfig = {
  name: env.appName,
  slug: env.appSlug,
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: env.scheme,
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: env.iosBundleId,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    package: env.androidPackage,
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: {
      projectId: env.projectId,
    },
  },
};

export default config
