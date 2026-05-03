import { defineConfig } from 'prisma/config'
import { PrismaNeon } from '@prisma/adapter-neon'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  // datasource.url is required for `prisma db push` and `prisma db pull`
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  migrate: {
    // adapter is required for `prisma migrate dev/deploy`
    async adapter(env) {
      return new PrismaNeon({ connectionString: env.DATABASE_URL! })
    },
  },
})
