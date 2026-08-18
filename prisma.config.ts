import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  datasource: {
    // Runtime DATABASE_URL should be pooled; migration jobs provide the direct URL.
    url: process.env.PRISMA_MIGRATION_DATABASE_URL ?? env("DATABASE_URL"),
  },
});
