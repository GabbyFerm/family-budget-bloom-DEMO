# 🌸 Family Budget Bloom

A high-performance, real-time financial dashboard designed to replace complex household spreadsheets with a modern, collaborative web application.

## ✨ About the Project

Family Budget Bloom was born out of a need to move away from static Excel sheets toward a dynamic, shared household economy tool. The application provides a high-density UI for granular monthly tracking alongside an automated yearly overview to visualize long-term financial growth.

## 🚀 Key Technical Highlights

- **Automated Savings Triggers**: Engineered custom PostgreSQL functions and triggers in Supabase to automatically recalculate total wealth whenever a savings entry is modified, ensuring real-time data integrity.
- **Shared Household Architecture**: Implemented a relational schema using Row Level Security (RLS) that auto-assigns users to "households," allowing for secure, real-time collaboration between partners.
- **High-Density Dashboard**: Designed a custom 3-column desktop layout utilizing CSS Grid to maximize vertical efficiency, including logic to split long expense lists into parallel sub-columns.
- **Intelligent Financial "Sweep"**: Built logic to "sweep" monthly surpluses into long-term savings, automating the transition between fiscal months and updating cumulative goals.

## 🛠 Technologies

- **Frontend**: React 18, TypeScript, Vite
- **UI & Styling**: Tailwind CSS, shadcn/ui, Radix UI, Lucide Icons
- **Backend & Database**: Supabase (PostgreSQL), Row Level Security (RLS)
- **State Management**: TanStack Query (React Query)
- **Charts**: Recharts

## 📦 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or bun
- A Supabase account

### Installation

1. **Clone the repository**

   ```sh
   git clone https://github.com/GabbyFerm/family-budget-bloom.git
   cd family-budget-bloom
   ```

2. **Install dependencies**

   ```sh
   npm install
   ```

3. **Environment setup**

   Create a `.env.local` file in the root directory:

   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run locally**
   ```sh
   npm run dev
   ```

## 📜 Available Scripts

- **`npm run dev`** - Starts the development server
- **`npm run build`** - Optimizes the application for production deployment
- **`npm run preview`** - Locally previews the production build
- **`npm run test`** - Executes the Vitest suite for logic verification

## 🔒 Security & Deployment

### Database Setup

Run the SQL migrations found in `supabase/migrations/` in your Supabase SQL editor to set up the tables and RLS policies.

### Authentication

Powered by Supabase Auth with custom triggers for automatic household assignment upon user registration.

### Deployment

Optimized for Vercel with HTTPS encryption and environment variable protection.

## 📄 License

**Private Project** - All Rights Reserved
