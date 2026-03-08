# 🌸 Family Budget Bloom

A high-performance, real-time financial dashboard designed to replace complex household spreadsheets with a modern, collaborative web application.

## ✨ About the Project

**Built with Vibe Coding during International Women's Day SheBuilds Celebration 🎉**

This project was vibecoded in a single day as part of the SheBuilds celebration for International Women's Day 2026. After building the full-featured application with vibe coding and Supabase integration, I saved it to GitHub, then created two separate repositories locally:

1. **Private Production App** - Connected to Supabase with real authentication and PostgreSQL backend
2. **This Demo Variant** - Standalone showcase version with mock data and zero configuration required

**Note**: This repository is the demo showcase version. It features an automated "Zero-Config Demo Mode" that uses Mock Data and LocalStorage instead of a live Supabase backend, allowing for instant exploration without account creation.

Family Budget Bloom was born out of a need to move away from static Excel sheets toward a dynamic, shared household economy tool. The application provides a high-density UI for granular monthly tracking alongside an automated yearly overview to visualize long-term financial growth.

## 🚀 Key Technical Highlights

- **Automated Savings Triggers**: Engineered a custom Auth Provider and Supabase client wrapper that detects missing API keys and seamlessly pivots the entire application into a "Mock Data" state.
- **High-Density Dashboard**: Designed a custom 3-column desktop layout utilizing CSS Grid to maximize vertical efficiency, including logic to split long expense lists into parallel sub-columns.
- **Intelligent Financial "Sweep"**: Built logic to "sweep" monthly surpluses into long-term savings, automating the transition between fiscal months and updating cumulative goals.
- **Relational Schema (Production Version)**: The original production app utilizes a PostgreSQL schema with Row Level Security (RLS) to manage shared household access.

## 🛠 Technologies

- **Frontend**: React 18, TypeScript, Vite
- **UI & Styling**: Tailwind CSS, shadcn/ui, Radix UI, Lucide Icons
- **State Management**: TanStack Query (React Query)
- **Charts**: Recharts
- **Production Backend (Reference)**: Supabase (PostgreSQL), RLS

## 📦 How to Explore the Demo

**Option 1: Live Demo**
1. Visit the Live URL: [[FamilyBudgetBloomDEMO](https://family-budget-bloom-demo.vercel.app/)]
2. The demo credentials are pre-filled on the landing page
3. Click "Logga in" to enter the demo mode

**Option 2: Run Locally**
```bash
npm install
npm run dev
```

**Demo Features:**
- Pre-filled demo credentials (`demo@portfolio.com` / `demo123`)
- Mock data with 3 months of sample transactions
- Changes persist to browser LocalStorage for a realistic experience
- No Supabase configuration needed (runs in pure demo mode)

## 📜 Available Scripts

- **`npm run dev`** - Starts the development server
- **`npm run build`** - Optimizes the application for production deployment
- **`npm run lint`** - Executes ESLint to ensure code quality and type safety

## 🔒 Production Version (Reference)

The private production version of this app uses:

- **Database**: PostgreSQL via Supabase with RLS (migrations available in `supabase/migrations/`)
- **Authentication**: Supabase Auth with custom triggers for household assignment
- **Deployment**: Vercel with environment variable protection

**Demo Mode (This Repo)**:
- Runs without Supabase by default
- To enable Supabase in this repo, set `VITE_USE_SUPABASE=true` in your `.env` file along with your Supabase credentials

## 📄 License

**Personal Portfolio Project** - All Rights Reserved
