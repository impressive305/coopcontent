FROM node:22-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
# The schema must be in place before npm ci: its postinstall runs prisma generate.
COPY prisma ./prisma
RUN npm ci
COPY src ./src
ENV NODE_ENV=production
EXPOSE 4000
# Apply pending migrations, then start the API.
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
