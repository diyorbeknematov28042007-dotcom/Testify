# Testify — O'zbek ta'lim platformasi

## 🚀 Local ishga tushirish

### 1. Dependencies o'rnatish
```bash
cd server && npm install
cd ../client && npm install
```

### 2. Database sozlash (Neon - bepul PostgreSQL)
1. https://neon.tech ga boring, bepul hisob oching
2. Yangi project yarating
3. Connection string nusxalab oling (postgresql://...)
4. `server/.env` fayl yarating:
```env
DATABASE_URL=postgresql://your-connection-string-here
PORT=3001
CLIENT_URL=http://localhost:5173
```

### 3. Database schema yaratish
```bash
cd server
npm run db:push
```

### 4. Ishga tushirish (2 terminal)
```bash
# Terminal 1 - Backend
cd server && npm run dev

# Terminal 2 - Frontend  
cd client && npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:3001

---

## 🌐 Render.com ga deploy qilish (BEPUL)

### Backend deploy:
1. https://render.com ga boring, GitHub bilan kirish
2. "New Web Service" → GitHub reponi ulang
3. Sozlamalar:
   - **Root Directory:** `server`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node dist/index.js`
4. Environment Variables qo'shing:
   - `DATABASE_URL` = Neon connection string
   - `CLIENT_URL` = https://your-frontend.onrender.com
   - `NODE_ENV` = production
5. Deploy!

### Frontend deploy:
1. Render'da "New Static Site"
2. Sozlamalar:
   - **Root Directory:** `client`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
3. Environment Variables:
   - `VITE_API_URL` = https://your-backend.onrender.com
4. Deploy!

> ⚠️ Frontend'da `vite.config.ts` dagi proxy ni o'rniga `VITE_API_URL` ishlatish kerak bo'ladi production'da. Pastdagi notani o'qing.

---

## 🔧 Production uchun qo'shimcha sozlama

`client/src/lib/api.ts` faylida `BASE` ni o'zgartiring:
```typescript
const BASE = import.meta.env.VITE_API_URL || '/api';
```

---

## 👤 Login ma'lumotlari

| Panel | URL | Login |
|-------|-----|-------|
| Admin | /admin/login | Username: `D1yoRBeK` (parol yo'q) |
| O'qituvchi | /teacher/login | Ro'yxatdan o'tish yoki kirish |
| Talaba | /student | Kod kerak |

---

## 📁 Fayl strukturasi

```
testify/
├── server/          # Node.js + Express backend
│   └── src/
│       ├── db/      # Drizzle ORM schema
│       ├── routes/  # API endpoints
│       └── middleware/
└── client/          # React + Vite frontend
    └── src/
        ├── pages/   # Sahifalar
        ├── components/
        ├── hooks/
        └── lib/
```
