FROM node:20-alpine

WORKDIR /usr/src/app

# Install dependencies (use package-lock when available)
COPY package*.json ./
RUN npm ci --only=production || npm install --only=production

# Copy source
COPY . .

ENV NODE_ENV=production

# Backend listens on 3000 inside container
EXPOSE 3000

CMD ["node", "server.js"]
