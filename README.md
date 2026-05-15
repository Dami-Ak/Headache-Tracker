# Headache & Medication Tracker

A mobile-first React web app for tracking headache episodes and measuring medication effectiveness.

## Stack

- React + Vite (TypeScript)
- Tailwind CSS v4
- Framer Motion
- Supabase (Postgres)

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. In the SQL Editor, run the contents of `supabase-schema.sql`
3. Copy your project URL and anon key from **Settings → API**

### 2. Environment variables

Create a `.env` file in the project root:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run locally

```bash
npm install
npm run dev
```

### 4. Deploy

```bash
npm run build
```

Deploy the `dist/` folder to Vercel or Netlify. Set the same env vars in your hosting dashboard.

## Features

- Log headache episodes in under 15 seconds
- Emoji-based intensity picker (Mild / Moderate / Severe)
- Track medication taken + outcome per episode
- Calendar heatmap showing headache frequency by intensity
- Days-since-last-headache counter + all-time personal best
- Medication effectiveness percentage
- Weekly summary stats
- Slide-up log form with Framer Motion animations
