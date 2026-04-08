# Academix

**Academix** is a full-stack school management and assessment platform designed to centralize academic workflows such as attendance tracking, scheduling, assessments, and grading.

---

## Overview

Academix is a web-based system that helps educational institutions manage academic operations through a centralized platform.

The system provides role-based access for administrators, teachers, and students, enabling structured and transparent interaction with academic processes.

---

## Tech Stack

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL
- Docker

---

## Core Features

- Role-based dashboards (Admin, Teacher, Student)
- Student and class management
- Attendance tracking
- Exams and assignments management
- Grade and results system
- Scheduling and notifications

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/academix-platform/academix.git
cd academix
2. Setup environment variables
cp .env.example .env
3. Start the database
docker compose up -d
4. Install dependencies
npm install
5. Setup the database
npx prisma db push
npx prisma db seed
6. Run the app
npm run dev

App runs at:

http://localhost:3000
```
