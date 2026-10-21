FROM node:18-alpine AS builder

WORKDIR /app
RUN apk add --no-cache python3 make g++ gcc

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine

# Install curl and build tools
RUN apk add --no-cache curl wget python3 make g++ gcc

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

EXPOSE 3002

CMD ["node", "dist/main"]




