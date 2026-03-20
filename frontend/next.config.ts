import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker/Railway 배포 지원 (Vercel은 자동 처리)
  output: "standalone",

  // 보안 헤더 (프로덕션 배포 시 활성화)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
