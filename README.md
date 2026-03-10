# BD Project Management

Aplikasi manajemen proyek berbasis web.

## Tech Stack
- **Frontend**: React + Vite + Tailwind CSS v4
- **Backend/Database**: Supabase
- **Deployment**: Railway (Docker)

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deployment (Railway)

Project ini menggunakan Dockerfile untuk deployment ke Railway. Environment variables yang diperlukan:

- `VITE_SUPABASE_URL` - Supabase API URL
- `VITE_SUPABASE_ANON_KEY` - Supabase Anon/Public Key
