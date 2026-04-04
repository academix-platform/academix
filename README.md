# Academix Frontend

Frontend application for **Academix**, a web-based school management and assessment platform designed to centralize academic workflows such as attendance tracking, scheduling, assessments, and grading.

---

## Overview

Academix is a web-based system that helps educational institutions manage academic operations through a centralized platform.  
The system provides role-based access for administrators, teachers, and students, allowing them to interact with core academic processes in an organized and transparent way.

The frontend is built with **Next.js, TypeScript, and Tailwind CSS**, following a **feature-based modular architecture** to ensure scalability and maintainability.

---

## Tech Stack

The frontend is built using modern web technologies:

- **Next.js** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **React**
- **React Hook Form** – form handling
- **Zod** – validation
- **Lucide React** – icons

---

## Core Features

The frontend supports the main modules of the Academix system:

- Secure authentication with role-based access
- Student and class management
- Electronic attendance tracking
- Assessment management (quizzes, assignments, exams)
- Grade management and result viewing
- Class scheduling with conflict detection
- Academic notifications and updates
- Role-based dashboards for administrators, teachers, and students

---

## Architecture

The project follows a **feature-based modular architecture**.

Each feature contains its own:

- components
- hooks
- api layer
- types
- business logic

This approach improves maintainability, scalability, and team collaboration.

---

## Getting Started

### 1. Clone the repository

git clone https://github.com/academix-platform/academix-front.git

### 2. Install dependencies

npm install

### 3. Run the development server

npm run dev

The application will run at:

http://localhost:3000

---

## Environment Variables

Create a `.env.local` file in the project root.

Example:

NEXT_PUBLIC_API_URL=http://localhost:8000/api

---

## Development Guidelines

To maintain consistency across the project:

- Use **TypeScript strict mode**
- Keep UI components **small and reusable**
- Avoid business logic inside UI components
- Use **custom hooks for data logic**

---

## Branching Strategy

Feature development follows a simple branching model.

Example branch:

feature/attendance-module

Commit message format:

feat: implement attendance table

---

## Contributing

1. Create a new branch

feature/new-feature

2. Commit your changes

git commit -m "feat: implement feature"

3. Push and open a **Pull Request**
