# ---- Production image for the Unit Task Tracker ----
FROM node:22-alpine

WORKDIR /app

# Install only production dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy the application code
COPY src ./src
COPY public ./public

ENV NODE_ENV=production PORT=3000
EXPOSE 3000

# Run as the non-root "node" user for security
USER node

# Docker checks the /health endpoint so it knows if the app is healthy
HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/server.js"]
