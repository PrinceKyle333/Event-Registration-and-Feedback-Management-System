# Central Mindanao University (CMU)
## Web-Based Event Registration and Feedback Management System
### BSIT 4B System Integration and Architecture (SIA) Project

A complete, production-grade Web-Based Event Registration and Feedback Management System for Central Mindanao University (CMU), built to demonstrate REST API Integration connecting event lifecycle workflows: Creation, Administrative Approval, Student Registration, Attendance Check-in, 4-Section Dynamic Evaluation, and Comprehensive Statistical Reports.

---

## 1. System Architecture & Features

### System Roles & Workflows
- **Administrator**:
  - Secure role-based authentication with bcrypt password hashing.
  - Approve or Reject event proposals submitted by organizers (with reason for rejection).
  - Activate or Deactivate events for evaluation (`is_active`).
  - Manage users (Students, Organizers, Administrators).
  - Dynamic Survey Section and Question Management (CRUD).
  - University-wide dashboard metrics, attendance rates, evaluation averages, and CSV / Printable Reports.
- **Event Organizer**:
  - Propose and create events (with capacity, registration deadline, venue, schedule, department).
  - Real-time registration participant roster.
  - One-click Attendance recording (`Mark Present` / `Mark Absent`).
  - View event feedback and section-by-section rating analytics for organized events.
- **Student / Participant**:
  - Browse approved and active CMU events with search & department filtering.
  - One-click Event Registration (enforces capacity limits & registration deadlines; prevents duplicates).
  - My Events & Attendance tracker.
  - Dynamic 4-Section Feedback Survey Submission (unlocked only for confirmed attendees; anonymous in reports; prevents duplicate submissions).

### 4-Section Survey & Evaluation Scale
Dynamic survey questions fetched via REST API:
1. **Section 1: Accommodation and Venue** (5 questions)
2. **Section 2: Spokesperson / Speaker Evaluation** (5 questions)
3. **Section 3: Food and Refreshments** (5 questions)
4. **Section 4: Event Coordination and Overall Experience** (5 questions)

**Rating Scale & Interpretations**:
- `1` – Very Poor (1.00–1.49: Very Unsatisfactory)
- `2` – Poor (1.50–2.99: Unsatisfactory)
- `3` – Fair (3.00–3.99: Satisfactory)
- `4` – Good (4.00–4.49: Very Satisfactory)
- `5` – Excellent (4.50–5.00: Excellent)

---

## 2. Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, Motion.
- **Backend**: Node.js + Express REST API (`server.ts`), served on the same port as the Vite dev server.
- **Database**: MySQL (or MariaDB, e.g. XAMPP) through `mysql2/promise` with parameterized queries and transactions (`server/repository.ts`).
- **Security**: bcrypt password hashing (`bcryptjs`), JSON Web Tokens (`jsonwebtoken`), and role-based access control middleware (`server/auth.ts`).

---

## 3. Local Installation & MySQL Setup

### Step 1: Clone & Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment
Copy `.env.example` to `.env` and set your MySQL user/password and a long random `JWT_SECRET`:
```bash
cp .env.example .env
```

### Step 3: Start MySQL
Start MySQL (XAMPP, MySQL Workbench, or a MySQL service). You do **not** need to import anything:
on first start the server creates the `event_evaluation_system` database and tables from
`database/event_evaluation_system.sql` and inserts the demo data.

> Upgrading from an older version? Drop the old database once so the new schema is created:
> `DROP DATABASE event_evaluation_system;`

### Step 4: Run the Application
```bash
npm run dev
```
Access the application at `http://localhost:3000`.

To clear all data and reload the demo dataset at any time:
```bash
npm run db:reset
```

---

## 4. Default Demo Accounts

| Role | Username | Password | Full Name |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Engr. Juan Dela Cruz |
| **Organizer** | `organizer1` | `organizer123` | Prof. Maria Santos |
| **Student** | `student1` | `student123` | Prince Kyle Christian Reston |
| **Student 2** | `student2` | `student123` | Alyssa Jean Ramos |
| **Student 3** | `student3` | `student123` | Joshua Dave Flores |

You can also use the **Quick Demo Role Switcher** in the top navigation or login page to test workflows instantly!

---

## 5. REST API Documentation

All endpoints are under `/api` and exchange JSON. After login, send the token on every request:
`Authorization: Bearer <token>`. Missing or invalid tokens return **401**; a valid token with the wrong role returns **403**.
Organizers can only manage events they created.

### Authentication & Users
| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | Public | Check bcrypt password, return JWT + user |
| POST | `/api/auth/register` | Public | Create a student or organizer account (never admin) |
| GET | `/api/auth/me` | Logged in | Current user from the token |
| PUT | `/api/users/profile` | Logged in | Update own profile/password (not role) |
| GET, POST | `/api/users` | Admin | List / create users |
| PUT | `/api/users/:id` | Admin | Update a user |
| PATCH | `/api/users/:id/status` | Admin | Activate / deactivate an account |

### Events
| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/events` | Public | Approved events (`all=true` adds pending/rejected for admin, own proposals for organizers); `search`, `department` filters |
| GET | `/api/events/:id` | Public (approved) | Event details with live counts |
| POST | `/api/events` | Organizer, Admin | Organizer proposal starts **pending**; admin-created events are approved |
| PUT | `/api/events/:id` | Owner organizer, Admin | Edit descriptive fields |
| PATCH | `/api/events/:id/approval` | Admin | Approve or reject (`rejection_reason`) |
| PATCH | `/api/events/:id/status` | Owner organizer, Admin | Open/close evaluation (`is_active`) |
| DELETE | `/api/events/:id` | Owner organizer, Admin | Delete (registrations and evaluations cascade) |

### Registration & Attendance
| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/api/events/:id/register` | Student | Register (checks approval, deadline, capacity, duplicates in a transaction) |
| GET | `/api/my-registrations` | Logged in | Own registrations with attendance and evaluation status |
| GET | `/api/events/:id/registrations` | Owner organizer, Admin | Live roster |
| PATCH | `/api/registrations/:id/attendance` | Owner organizer, Admin | `attended`, `absent`, or `registered` |
| DELETE | `/api/registrations/:id` | Student (own), Owner organizer, Admin | Cancel registration |

### Survey & Evaluation
| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/survey/sections` | Logged in | 4 sections and their questions |
| POST, PUT | `/api/survey/sections[/:id]` | Admin | Manage sections |
| POST, PUT, DELETE | `/api/survey/questions[/:id]` | Admin | Manage questions |
| POST | `/api/events/:id/evaluations` | Student | Submit 1–5 ratings + optional comment; only if marked attended, once per event (transaction) |
| GET | `/api/my-evaluations` | Logged in | Own submitted evaluations |
| GET | `/api/events/:id/evaluation-report` | Owner organizer, Admin | Section and question means, interpretation, response rate, anonymous comments |

### Dashboard, Reports & System
| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/admin/dashboard` | Public | Campus-wide totals (no personal data) |
| GET | `/api/reports/events` | Admin (all), Organizer (own) | Per-event registrations, attendance, evaluations, average rating |
| GET | `/api/reports/rankings` | Admin | Evaluated events ranked by overall mean |
| GET | `/api/reports/registrations` | Admin | Registrations and attendance by department |
| GET | `/api/reports/evaluations` | Admin | Evaluation count and average per event |
| GET | `/api/activity`, PATCH `/api/activity/seen` | Logged in | Activity log / notifications for the user's scope |
| GET | `/api/system/export-sql` | Admin | Download schema + live data as SQL |
| POST | `/api/system/reset-demo` | Admin | Reload the demo dataset |
