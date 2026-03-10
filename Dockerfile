# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Accept build args for Vite env vars
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Set them as env vars so Vite can embed them during build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the app (Vite will inline VITE_ env vars here)
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install serve globally
RUN npm install -g serve

# Copy built files from build stage
COPY --from=build /app/dist ./dist

# Expose port (Railway sets PORT env var)
EXPOSE ${PORT:-3000}

# Start the server
CMD ["sh", "-c", "serve -s dist -l ${PORT:-3000}"]
