FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

ARG NODE_ENV=production

COPY . .

RUN if [ "$NODE_ENV" = "production" ]; then npm run build; fi

FROM nginx:alpine AS production

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

FROM node:20-alpine AS development

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

