# Mindful HR

## Overview
Mindful HR is a role-based HR management web app for healthcare and operations-heavy teams. It brings employee records, recruitment, onboarding, rostering, attendance, leave, payroll, training, reviews, alerts, clinical documents, and HR intelligence into one Supabase-backed dashboard.

## Problem Statement
HR teams often manage staff data, shift planning, hiring pipelines, attendance, leave approvals, payroll inputs, and compliance reporting across disconnected tools. This creates duplicate work, slow approvals, weak visibility, and higher risk of mistakes when teams need real-time operational decisions.

## Solution
Mindful HR centralizes core HR workflows in one authenticated app. Staff, department heads, HR managers, and admins see role-specific dashboards and navigation. Supabase powers authentication, data storage, role access, and backend edge functions, while the React frontend gives teams fast workflows for daily HR operations.

## Seeded Access
Shared password: `MindfulHR@2024`

| Role | Email |
| --- | --- |
| super_admin | midhunds@gmail.com |
| hr_manager | hr@mindfulhr.test |
| department_head | depthead@mindfulhr.test |
| center_head | centerhead@mindfulhr.test |
| clinical_lead | clinicallead@mindfulhr.test |
| program_director | programdirector@mindfulhr.test |
| ward_incharge | wardincharge@mindfulhr.test |
| duty_medical_officer | dmo@mindfulhr.test |
| psychologist | psychologist@mindfulhr.test |
| psw | psw@mindfulhr.test |
| admission_counsellor | admissions@mindfulhr.test |
| nursing_head | nursinghead@mindfulhr.test |
| rehab_coordinator | rehab@mindfulhr.test |
| staff | staff@mindfulhr.test |

## Features
- Role-based dashboards for staff, department heads, HR managers, and admins
- Employee directory with search, employee profiles, add employee flow, and Excel/CSV bulk upload
- Recruitment pipeline with requisitions, candidates, screening templates, interviews, approvals, offers, and probation tracking
- Onboarding dashboard with case details, templates, checklist-style workflows, and employee conversion
- Roster and duty board tools for shift planning, coverage visibility, fairness summaries, fatigue warnings, and role mix checks
- Attendance module with clock in/out, geolocation capture, daily records, exceptions, regularization review, analytics, payroll readiness, and CSV export
- Leave management with requests, approval chains, team balances, coverage warnings, calendars, forecasting, overrides, and audit logs
- Payroll workspace with salary structures, adjustments, payroll runs, exceptions, payslips, history, reports, labor cost, and variance analysis
- Growth tools for training and performance reviews
- Intelligence dashboards for KPIs, audit, compliance, and alerts
- Clinical document area for healthcare team document workflows
- System settings for branches, departments, designations, programs, shifts, and center configuration

## Tech Stack
- Frontend: React 18, TypeScript, Vite, React Router, TanStack Query
- UI: Tailwind CSS, shadcn/ui-style components, Radix UI, lucide-react, Recharts
- Backend: Supabase Auth, Supabase Postgres, Supabase Edge Functions
- Database: Supabase PostgreSQL with SQL migrations in `supabase/migrations`
- APIs: Supabase JavaScript client, browser geolocation, OpenAI-ready Supabase edge functions for resume parsing and screening
- Hosting: Vercel, Netlify, Cloudflare Pages, or any static host that supports Vite builds

## Codex / OpenAI Usage
Codex and OpenAI tools were used during the build for:

- Ideation of HR workflows and role-specific dashboard structure
- Architecture planning for React routes, Supabase integration, and modular HR domains
- Code generation for pages, dialogs, dashboards, tables, forms, and reusable UI components
- Debugging Supabase queries, protected routes, attendance logic, payroll screens, and responsive layouts
- Testing support with Vitest and Playwright configuration
- Documentation generation for GitHub hosting and local setup
- API integration planning for Supabase edge functions such as resume parsing and candidate screening

## Demo
Add your demo or pitch video link here.

Example:
```text
https://your-demo-link.com
```

## Visuals
![](./assets/Screenshot%202026-06-07%20072704.png)
![](./assets/Screenshot%202026-05-27%20160135.png)
![](./assets/Screenshot%202026-06-06%20221000.png)
![](./assets/Screenshot%202026-05-28%20092734.png)
![](./assets/Screenshot%202026-06-07%20072537.png)
![](./assets/Screenshot%202026-06-07%20072725.png)

## How to Run Locally

```bash
git clone <repo-url>
cd <project-folder>
npm install
npm run dev
```

Local dev server runs on:

```text
http://localhost:8080
```

Create a `.env` file in the project root:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

Build for production:

```bash
npm run build
```

Preview production build locally:

```bash
npm run preview
```

Run tests:

```bash
npm run test
```

Run lint:

```bash
npm run lint
```

## Deployment Notes
For Vercel, Netlify, or Cloudflare Pages:

- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`

Before deploying, connect the app to a Supabase project and apply the SQL migrations from `supabase/migrations`.
