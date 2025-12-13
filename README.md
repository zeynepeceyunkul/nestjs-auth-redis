# 🔐 NestJS Authentication System  
### JWT + Redis Refresh Token Rotation

Production-ready authentication system built with **NestJS**, featuring **JWT access tokens**, **refresh token rotation**, **Redis-based session management**, and **secure logout flow**.

This project is designed as a **reusable authentication backend** for modern web applications.

---

## 🚀 Features

- ✅ User Registration & Login  
- 🔐 JWT Access Token authentication  
- ♻️ Refresh Token **Rotation** (one-time use)  
- 🧠 Redis-based refresh token storage  
- 🚪 Secure Logout (refresh token invalidation)  
- 🔒 Protected routes with JWT Guard  
- 🧱 Modular & scalable NestJS architecture  

---

## 🛠️ Tech Stack

- **Framework:** NestJS (TypeScript)  
- **Database:** PostgreSQL (TypeORM)  
- **Authentication:** JWT (Access Token)  
- **Session Store:** Redis  
- **Security:** bcrypt (password hashing)  
- **Containerization:** Docker (Postgres + Redis)  

---

## 📦 Project Structure

```text
src/
├── auth/
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   ├── jwt.strategy.ts
│   └── dto/
│       ├── register.dto.ts
│       └── refresh-token.dto.ts
│
├── users/
│   ├── user.entity.ts
│   ├── users.service.ts
│   └── users.module.ts
│
├── redis/
│   └── redis.module.ts
│
├── app.module.ts
└── main.ts

⚙️ Environment Variables

Create a .env file in the root directory:

PORT=3000

DB_HOST=localhost
DB_PORT=5433
DB_USER=postgres
DB_PASS=postgres
DB_NAME=authdb

JWT_SECRET=super-secret-key
JWT_EXPIRES_IN=15m

REDIS_HOST=localhost
REDIS_PORT=6370


⚠️ .env file is ignored by Git for security reasons.

🐳 Running with Docker (Postgres + Redis)
docker compose up -d

▶️ Running the Application
npm install
npm run start:dev


Application will be available at:

http://localhost:3000

🔐 Authentication Flow
1️⃣ Register
POST /auth/register

2️⃣ Login
POST /auth/login


Returns:

{
  "accessToken": "...",
  "refreshToken": "..."
}

3️⃣ Access Protected Route
GET /auth/profile
Authorization: Bearer <accessToken>

4️⃣ Refresh Token (Rotation)
POST /auth/refresh


Old refresh token is invalidated

New access + refresh token is issued

5️⃣ Logout
POST /auth/logout


Refresh token is removed from Redis

Session is terminated securely

🧪 Testing
npm run test
npm run test:e2e

🧠 Notes

Refresh tokens are single-use (rotation pattern)

Redis prevents refresh token reuse attacks

Architecture is suitable for scaling & microservices

👩‍💻 Author

Zeynep Ece Yünkül
