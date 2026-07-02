# Bengtech Employee Attendance and Payroll System

Production-ready MVP for Bengtech Cellphone and Accessories using Next.js, TypeScript, Tailwind CSS, and Supabase.

## Features

- Employee login with email or username
- Mobile-first Time In and Time Out with selfie camera, GPS, and server timestamp
- Branch GPS radius validation
- Attendance statuses: Present, Late, Absent, Day Off, Missing Time Out, Approved Leave
- Admin dashboard with filters and daily summary cards
- Employee and branch management
- Monthly payroll generation with cash advance, allowance, overtime, and deductions
- Excel and PDF exports
- Printable payslips
- Half-day attendance for morning-only and afternoon duty
- Real-time admin GPS perimeter alerts with audit logs
- Original and watermarked selfie evidence storage
- One registered phone/browser per employee for attendance, with admin reset approval
- Supabase RLS for employee, branch manager, and admin access

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Add your Supabase project values to `.env.local`.

4. In Supabase SQL Editor, run:

```text
supabase/schema.sql
supabase/seed.sql
```

If Supabase says an object already exists from an older setup, run this first:

```text
supabase/reset.sql
```

Then run `schema.sql` and `seed.sql` again.

For an existing database, run:

```text
supabase/migrations/20260702_attendance_payroll_improvements.sql
```

5. Create your first admin user in Supabase Authentication, then insert a matching `profiles` row using that user's UUID with `role = 'admin'`.

Or run the local helper:

```bash
npm run setup:admin -- admin@bengtech.local YourStrongPassword "Bengtech Owner"
```

6. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Supabase Storage

The schema creates private buckets:

- `attendance-selfies`
- `profile-photos`

Attendance selfies are uploaded by the authenticated employee and stored by path on each attendance record.

## Automatic Attendance Jobs

The app includes `/api/cron/attendance` for automatic attendance cleanup.

- After 9:00 AM Asia/Manila it calls `mark_daily_absences()`.
- After 6:00 PM Asia/Manila it calls `mark_missing_timeouts()`.

For Vercel, `vercel.json` schedules this endpoint. Add `CRON_SECRET` in Vercel environment variables if you want to protect the endpoint, then call it with `Authorization: Bearer <secret>` from external schedulers.

You may also schedule these Supabase SQL functions directly:

- `select mark_daily_absences();` after 9:00 AM Asia/Manila
- `select mark_missing_timeouts();` after 6:00 PM Asia/Manila

## Deploy to Vercel

1. Push the project to GitHub.
2. Import the repo in Vercel.
3. Add the same environment variables from `.env.example`.
4. Deploy.

Use HTTPS in production because browser camera and GPS permissions require a secure origin.

## Registered Phone Rule

The first phone/browser an employee uses for Time In becomes their registered attendance device. Later Time In or Time Out attempts from another phone are blocked. If an employee changes phones, they can send a device reset request from the blocked screen.

Admins can approve this by opening:

```text
/app/admin/devices
```

Delete the employee's registered device there. The employee's next successful attendance action will register the new phone.

Browsers do not expose IMEI numbers, so the app uses a secure browser-generated device ID instead.
