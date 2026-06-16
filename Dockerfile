FROM node:24-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --ignore-engines
COPY . .
RUN npx tsc --project tsconfig.json \
    && test -f dist/src/src/server.js \
    && npm prune --omit=dev

FROM node:24-alpine
WORKDIR /app
COPY --from=builder /app/package.json .
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/docs ./dist/src/docs
COPY --from=builder /app/src ./src
CMD ["node", "dist/src/src/server.js"]
