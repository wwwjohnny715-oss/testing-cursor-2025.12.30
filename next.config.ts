import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // 優化 bundle 大小
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-icons",
      "date-fns",
    ],
  },
  // 外部化大型套件（不打包到 worker）
  serverExternalPackages: [
    "better-sqlite3",
  ],
  // 禁用生產環境的 source maps 以減少大小
  productionBrowserSourceMaps: false,
};

export default withNextIntl(nextConfig);
