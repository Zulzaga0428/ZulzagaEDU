import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Гэрийн хавтас (C:\Users\User) өөрөө git repo бөгөөд дотроо package-lock.json
  // агуулдаг тул Turbopack үндсийг буруу таамаглана. Ил зааж өгнө.
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
