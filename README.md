# DGHS MT-Lab Directory

Full-stack directory application for **DGHS Medical Technologist (Lab)** personnel in Bangladesh, comprising an automated high-speed Playwright scraper for `https://hrm.dghs.gov.bd/`, a Supabase (PostgreSQL) database with Row Level Security, password-protected app access, user management, administrative settings, and a responsive React (Vite) frontend deployed on Vercel.

---

## 1. Credentials & Default Access

### 1.1 Web Application Login & Settings Access
- **Default Username**: `ansarul`
- **Default Email**: `ansarul.contact@gmail.com`
- **Password**: `Ansarul@233`
- **Role**: `Admin`

### 1.2 Portal Scraping Credentials (Pre-configured)
- **Portal Login URL**: `https://hrm.dghs.gov.bd/login`
- **HRM Username**: `neyamatpur@uhfpo.dghs.gov.bd`
- **HRM Password**: `uhcN#2023`
- **Posting Fallback URLs**:
  1. `https://hrm.dghs.gov.bd/postings/create?provider_id=159165`
  2. `https://hrm.dghs.gov.bd/postings/create?provider_id=14436`
  3. `https://hrm.dghs.gov.bd/postings/create?provider_id=6363`
  4. `https://hrm.dghs.gov.bd/postings/create?provider_id=194744`

---

## 2. Key Features

- **Official Geographic Hierarchy**: Strict canonical mapping for **8 Divisions**, **64 Districts**, and corresponding **Upazilas** of Bangladesh.
- **Default Sorting**: Staff records default to **PRL Date (Earliest first)**.
- **Global App Authentication**: Password-protected login screen.
- **Administrative Settings Modal**:
  - View and customize portal URLs and scraper credentials (persisted in local storage with reset capability).
  - **User Management**: Add, edit, or delete directory users.
- **High-Speed Scraper**: Concurrently scrapes all ~2,506 records in **~2.3 minutes** (~17.5 records/sec).
- **Automated Workflow**: Configured to run every 7 days on Sunday (`cron: '0 0 * * 0'`).
- **Footer**: `DGHS Medical Technologist (Lab) Personnel Directory • Developed By Ansarul Anis`

---

## 3. Quick Start

```bash
# 1. Run Scraper Locally (All 2,506 records or limited batch)
cd scraper
npm install
node index.js --limit=50

# 2. Run React Frontend
cd ../frontend
npm install
npm run dev
```

Open `http://localhost:3000` and sign in with `ansarul.contact@gmail.com` / `Ansarul@233`.