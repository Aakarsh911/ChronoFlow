import type { NextConfig } from "next";
import os from "os";
import path from "path";

/** Dev cache outside Dropbox — sync races corrupt `.next` and cause ENOENT on manifest temps. */
const devDistDir = path.join(os.tmpdir(), "chronoflow-next-dev");

const nextConfig: NextConfig = {
  distDir: process.env.CF_DEV ? devDistDir : ".next",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
