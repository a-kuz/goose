FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

RUN if [ "$NODE_ENV" = "production" ]; then npm run build; fi

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && if [ \"$NODE_ENV\" = \"production\" ]; then node dist/index.js; else npm run dev; fi"]

