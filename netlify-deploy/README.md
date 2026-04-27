# Netlify Deploy Web

Upload HTML → pilih nama → langsung live di `nama.netlify.app`

## Setup (5 menit)

### 1. Push ke GitHub
```bash
git init
git add .
git commit -m "first commit"
git remote add origin https://github.com/username/netlify-deploy.git
git push -u origin main
```

### 2. Deploy ke Vercel
1. Buka vercel.com → New Project
2. Import repo GitHub tadi
3. Klik Deploy

### 3. Set Environment Variable di Vercel
1. Buka project di Vercel → Settings → Environment Variables
2. Tambahkan:
   - **Name:** `NETLIFY_TOKEN`
   - **Value:** token Netlify lo (generate di netlify.com → User Settings → Applications)
3. Klik Save
4. Redeploy project

### 4. Selesai!
Web lo live di `nama-project.vercel.app`

## Struktur File
```
netlify-deploy/
├── api/
│   ├── deploy.js    ← Serverless function: deploy ke Netlify
│   └── check.js     ← Serverless function: cek ketersediaan nama
├── public/
│   └── index.html   ← Frontend UI
├── vercel.json      ← Config Vercel
└── package.json
```

## Cara Kerja
1. User upload file HTML di web
2. User ketik nama subdomain (dicek availability real-time)
3. Klik Deploy → `/api/deploy` dipanggil
4. Backend buat site baru di Netlify via API
5. Upload HTML ke site tersebut
6. User dapet link `nama.netlify.app` ✓

## Limit Netlify Free
- 500 sites per akun
- 100GB bandwidth/bulan
- Deploy unlimited
