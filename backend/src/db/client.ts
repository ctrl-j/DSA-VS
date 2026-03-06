import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to initialize Prisma client.");
}

const pgPool = new Pool({ connectionString: databaseUrl });
const prismaAdapter = new PrismaPg(pgPool);

export const prisma = new PrismaClient({ adapter: prismaAdapter });
