# The Last of Guss

Браузерная тап-игра. Гусь подхватил мутацию G-42 и все соревнуются кто больше натапает.

![Demo](./screencast.gif)

## Стек

**Backend:** Fastify, PostgreSQL, Prisma, JWT, WebSocket  
**Frontend:** React, TypeScript, Vite  
**Инфраструктура:** Docker Compose, Nginx (балансировка на 3 инстанса)

## Правила

- 1 тап = 1 очко, каждый 11-й тап = 10 очков
- Тапать можно только в активном раунде
- Админ создает раунды, Никита тапает впустую (его тапы не считаются)

## Запуск

```bash
cd infra
docker compose up --build
```

Открыть http://localhost

## Разработка

**Backend:**
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## API

`POST /api/auth/register` - регистрация  
`POST /api/auth/login` - вход  
`POST /api/rounds` - создать раунд (админ)  
`POST /api/tap` - тапнуть  
`WS /ws` - real-time

## Как работает

- PostgreSQL с Serializable транзакциями для race conditions
- 3 backend инстанса за Nginx с least_conn балансировкой
- WebSocket broadcast для синхронизации между инстансами
- Автоматическое обновление статусов раундов

Aleksandr Kuznetsov


