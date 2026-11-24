# MEAL Management System — Web App

Web dashboard for **MEAL** (Monitoring, Evaluation, Accountability & Learning) teams in humanitarian and charity projects.
It is one half of my graduation project (2025); the other half is the Arabic survey analytics pipeline in
[automated-analyzing-arabic-MCQ-survey](https://github.com/rami-othman/automated-analyzing-arabic-MCQ-survey).

Built with Zaher Alsehli. I built most of the web app.

## What it does

- **Projects**: create and track projects with code, donor, sector, sites, implementing partners, dates and status (draft, paused, completed, closed, cancelled), plus search, pagination and an archive.
- **Feedback & accountability**: collect beneficiary and monitoring feedback, tag it (quality, access, safety, responsiveness), set priority and follow it from *new* to *resolved*.
- **Public feedback via QR**: every project gets a public feedback link (`/f/:projectId`) and a downloadable QR code, so beneficiaries can submit feedback from their phones without an account.
- **Users & roles**: Charity Manager, Monitoring Team and Project Manager roles, with per-project access.

## Tech stack

React 18 · TypeScript · Vite · Tailwind CSS · React Router · Zod · `qrcode`

The app talks to a separate REST backend; set its address in `src/lib/api.ts` (`API_BASE`).

## Run locally

```bash
npm install
npm run dev
```

## Project structure

```
src/
  pages/        Home, Create project, Project details, Feedback, Public feedback, Users, Archive
  components/   Sidebar, search, pagination, status badges, project cards, login
  lib/api.ts    API client
  types/        Project, User and Feedback models
```
