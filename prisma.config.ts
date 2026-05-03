import { defineConfig } from 'prisma/config'
import { PrismaNeon } from '@prisma/adapter-neon'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    async adapter(env) {
      return new PrismaNeon({ connectionString: env.DATABASE_URL! })
    },
  },
})
