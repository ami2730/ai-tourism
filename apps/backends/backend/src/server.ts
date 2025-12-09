// src/server.ts
import app from "./app.ts";
import { env } from "./config/env.ts";
import {prisma} from "./config/db.ts";
import { logger } from "./config/logger.ts";

async function startServer() {
  try {
    await prisma.$connect();
    logger.success("Connected to PostgreSQL database");

    // Start server
    app.listen(env.PORT, () => {
      logger.success(`Backend running on port ${env.PORT}`);
      logger.info(`Environment: ${env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  logger.info("Database disconnected");
  process.exit(0);
});
