# Use Node.js 20
FROM node:20-slim

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source
COPY . .

# Expose Vite port
EXPOSE 5173

# Start command (Dev mode for now to support the current workflow)
CMD ["npm", "run", "dev", "--", "--host"]
