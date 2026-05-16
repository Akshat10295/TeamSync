# Use Node.js 20
FROM node:20-slim

# Install Docker CLI (needed for execution engine to talk to host Docker)
RUN apt-get update && apt-get install -y docker.io

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy source
COPY . .

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "start"]
