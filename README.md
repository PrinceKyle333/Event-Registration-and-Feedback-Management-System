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

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide React, Motion.
- **Backend**: Express REST API endpoints running alongside Vite middleware (`server.ts`).
- **Database**:
  - MySQL with schema `event_evaluation_system` (SQL file in `/database/event_evaluation_system.sql`).
  - Built-in zero-config persistent storage layer with ACID transactions, relational integrity, and auto-seeding.
  - Live export endpoint `GET /api/system/export-sql`.

---

## 3. Local Installation & MySQL Setup

### Step 1: Clone & Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### Step 3: Initialize MySQL Database
Open terminal or MySQL workbench and execute:
```bash
mysql -u root -p < database/event_evaluation_system.sql
```

### Step 4: Run the Application
```bash
npm run dev
```
Access the application at `http://localhost:3000`.

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

### Events API
- `GET /api/events` – List approved and available events. Query params: `status`, `department`, `search`, `all=true` (admin/organizer).
- `GET /api/events/:id` – Retrieve complete details for a single event.
- `POST /api/events` – Create a new event (organizer/admin).
- `PUT /api/events/:id` – Update an existing event.
- `PATCH /api/events/:id/approval` – Approve or reject an event (`status`: `'approved'|'rejected'`, `rejection_reason`).
- `PATCH /api/events/:id/status` – Activate/deactivate an event for evaluation (`is_active`: `1|0`).
- `DELETE /api/events/:id` – Delete an event.

### Registration API
- `POST /api/events/:id/register` – Register the current student for an event.
- `GET /api/events/:id/registrations` – View registration list & attendance roster.
- `PATCH /api/registrations/:id/attendance` – Record participant attendance (`attendance_status`: `'attended'|'absent'|'registered'`).
- `DELETE /api/registrations/:id` – Cancel registration.

### Survey & Evaluation API
- `GET /api/survey/sections` – Retrieve survey sections and questions.
- `POST /api/events/:id/evaluations` – Submit evaluation responses and optional comments (atomic transaction).
- `GET /api/events/:id/evaluations` – Retrieve evaluation responses (authorized roles).
- `GET /api/events/:id/evaluation-report` – Generate calculated statistical summary with section averages & qualitative interpretation.

### Admin & Reporting API
- `GET /api/admin/dashboard` – System-wide KPI counters (events, registrations, attendance rate, evaluations).
- `GET /api/reports/events` – Comprehensive events report with metrics.
- `GET /api/reports/registrations` – Registrations breakdown across departments.
- `GET /api/reports/evaluations` – Evaluation satisfaction distribution and rankings.
- `GET /api/system/export-sql` – Download current MySQL database dump.
