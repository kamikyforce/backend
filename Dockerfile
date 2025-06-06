FROM node:18-slim

WORKDIR /app

# Install system dependencies including postgresql-client for database checks
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first for better Docker layer caching
COPY package.json package-lock.json ./
RUN npm install

# Copy source code and configuration
COPY . .

# Generate Prisma client during build
RUN npx prisma generate

# Build only the src directory (exclude tests and seed)
RUN npm run build

# Copy and make start script executable
COPY start.sh .
RUN chmod +x start.sh

EXPOSE 3000

# Use the start script that handles database setup
CMD ["./start.sh"]
