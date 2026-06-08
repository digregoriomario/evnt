FROM node:20-alpine

WORKDIR /app
ENV NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_LOGLEVEL=error \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    PRISMA_HIDE_UPDATE_MESSAGE=true

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci --no-audit --no-fund --loglevel=error

COPY prisma ./prisma
RUN npx prisma generate --no-hints

COPY tsconfig.json ./
COPY src ./src

EXPOSE 4000

CMD ["npm", "run", "dev"]
