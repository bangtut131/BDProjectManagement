# BD Project Management

Aplikasi manajemen proyek berbasis web.

## Tech Stack
- **Frontend**: React + Vite + Tailwind CSS v4
- **Backend/Database**: Supabase
- **Deployment**: Coolify / Docker

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deployment (Coolify / Docker)

Project ini menggunakan Dockerfile untuk deployment ke Coolify/VPS. Environment variables yang diperlukan:

- `VITE_SUPABASE_URL` - Supabase API URL
- `VITE_SUPABASE_ANON_KEY` - Supabase Anon/Public Key
