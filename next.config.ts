import { withBotId } from "botid/next/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    remotePatterns: [
      {
        hostname: "avatar.vercel.sh",
      },
      {
        protocol: "https",
        hostname: "xtuvxkwljdqjttypjwxt.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default withBotId(nextConfig);
