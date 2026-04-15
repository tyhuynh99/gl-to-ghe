FROM node:20-alpine

# Install git and openssh for cloning/pushing
RUN apk add --no-cache git openssh-client

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Build the Next.js app
RUN npm run build

# Create directory for git cloning
RUN mkdir -p /tmp/migration

# Set environment variable for local git usage
ENV GIT_TERMINAL_PROMPT=0

# Expose port 3000
EXPOSE 3000

# Start Next.js server
CMD ["npm", "start"]
