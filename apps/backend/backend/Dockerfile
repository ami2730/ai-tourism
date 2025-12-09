FROM node:20-alpine

WORKDIR /app

# Install dependencies first (better layer caching)
# Build context is parent directory, so copy from backend/
COPY backend/package*.json ./
RUN npm install

# Install tsx for ES module support
RUN npm install --save-dev tsx

# Copy the rest of the backend source
COPY backend/ .

# Generate Prisma client
RUN npm run db:generate

# Environment & port
ENV NODE_ENV=production
EXPOSE 3000

# Start the TypeScript server using tsx with watch mode for hot-reload
# Use --watch flag for automatic reloading on file changes
CMD ["npx", "tsx", "watch", "src/server.ts"]



