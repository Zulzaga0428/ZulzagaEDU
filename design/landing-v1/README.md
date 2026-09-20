# Zulzaga EDU — нүүр хуудас

Next.js (App Router) + Tailwind CSS v4 + lucide-react.

## Суулгах

```bash
npx create-next-app@latest zulzaga-edu --typescript --tailwind --app --src-dir --import-alias "@/*"
cd zulzaga-edu
npm install lucide-react
```

Дараа нь энэ хавтасны файлуудыг төслийнхөө ижил байрлалд хуулна:

```
src/app/layout.tsx
src/app/page.tsx
src/app/globals.css
src/components/landing/role-card.tsx
src/components/landing/decor.tsx
public/manifest.json
```

```bash
npm run dev
```

## Зурагнууд

Кодыг зураггүйгээр ажиллана — үүргийн картууд emoji-гоор орлоно.
Жинхэнэ зургуудаа доорх замд тавихад автоматаар солигдоно:

```
public/img/logo.png       — малгайтай мууртай лого
public/img/teacher.png    — багшийн зураг
public/img/parent.png     — эцэг эхийн зураг
public/img/student.png    — сурагчийн зураг
public/icons/icon-192.png
public/icons/icon-512.png
public/icons/icon-512-maskable.png
```

Зургийг PNG, дэвсгэр нь тунгалаг (transparent) байвал хамгийн зөв харагдана.

## Өнгөний тохиргоо

Бүх өнгө `globals.css` доторх `@theme` блокт байна. Нэг газраас өөрчилнө.

## Холбоосууд

Товчнууд одоогоор дараах замууд руу заана. Claude Code-д эдгээр хуудсыг
дараагийн алхмаар хийлгэнэ:

- `/login`
- `/join`
- `/join/teacher`
- `/join/parent`
- `/join/student`
- `/privacy`, `/help`, `/contact`

## Дараагийн алхам

`manifest.json` бэлэн боловч service worker хараахан байхгүй тул
"Апп суулгах" товч Chrome дээр гарахгүй. Offline болон суулгах
боломжийг идэвхжүүлэхийн тулд `next-pwa` эсвэл гараар service worker
нэмэх шаардлагатай.
