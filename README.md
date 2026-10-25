# Code Sentinel

Code Sentinel is a full-stack, AI-assisted repository health platform designed to help developers and teams monitor the quality of their GitHub projects in real time. It connects to GitHub repositories, analyzes code activity, surfaces issues, and delivers a clear health score with actionable insights.

This project was built to show end-to-end product thinking: authentication, GitHub integrations, background scanning, data visualization, and AI-powered review workflows in a single application.

## Why this project stands out

- GitHub-connected monitoring for real repositories
- Automated scanning and issue detection for code health
- AI-powered semantic review to highlight deeper code concerns
- Clean dashboard for tracking repository status over time
- PDF reporting for sharing results with stakeholders
- Full-stack implementation that feels like a real SaaS product

## What the app does

Code Sentinel lets a user:

- Connect one or more GitHub repositories
- Trigger a scan manually or from repo events
- View a repository health score and severity breakdown
- Track trends across scans over time
- Review detected issues and their explanations
- Run AI-driven semantic analysis on a scan
- Export a PDF report for stakeholder communication

## Core features

### 1. Repository management
Users can sign in with GitHub, connect repositories, and manage them from a dashboard. Each repo is tracked with metadata, health trends, and scan history.

### 2. Automated health scoring
Repository analysis produces a health score along with breakdowns by severity, making it easy to understand where a codebase is strong and where it needs attention.

### 3. Issue tracking
The platform captures and organizes issues discovered during analysis, helping teams quickly identify risk areas.

### 4. AI semantic review
The app includes AI-powered review flows that can analyze scan results and surface additional meaningful findings beyond simple static detection.

### 5. Reporting
Health summaries can be exported as PDF reports, which is useful for engineering leads, product teams, or leadership reviews.

## Tech stack

- Frontend: React, Vite, React Router, Tailwind CSS
- Backend: Node.js, Express
- Database: MongoDB
- Auth & integration: GitHub OAuth, GitHub API
- Visualization: Recharts
- AI workflow support: backend review endpoints and issue analysis pipeline
- Document generation: PDFKit

## Architecture overview

The project is split into two main parts:

- Frontend: interactive dashboard and repo detail pages
- Backend: authentication, repository management, scan orchestration, AI review endpoints, and reporting APIs

The backend stores connected repositories, scan results, and issue data in MongoDB while communicating with GitHub to fetch repo metadata and manage repository hooks.

## How it works

1. User signs in with GitHub
2. User connects a repository from the dashboard
3. The system registers the repo and starts tracking it
4. A scan runs to evaluate repository health and identify issues
5. Results are stored and visualized on the frontend
6. The user can trigger AI review and export reports as needed

## Live demo

Demo: https://code-sentinel-v1-five.vercel.app

## Project structure

```text
code_sentinel_v1/
├── backend/
│   ├── src/
│   ├── package.json
│   └── render.yaml
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── .gitignore
└── README.md
```

## Getting started locally

### Prerequisites

- Node.js 18+
- MongoDB instance
- GitHub account and OAuth app credentials

### 1. Clone the repository

```bash
git clone https://github.com/MohammedHashimNilger/code_sentinel_v1.git
cd code_sentinel_v1
```

### 2. Set up the backend

```bash
cd backend
npm install
```

Create a `.env` file inside `backend/` with the required configuration, including:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_connection_string
CLIENT_URL=http://localhost:5173
BACKEND_URL=http://localhost:5000
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
JWT_SECRET=your_secret_key
```

Then start the backend:

```bash
npm run dev
```

### 3. Set up the frontend

```bash
cd ../frontend
npm install
```

Create a `.env` file inside `frontend/` if needed:

```env
VITE_API_URL=http://localhost:5000
```

Then start the frontend:

```bash
npm run dev
```

## What I built as a developer

This project demonstrates practical product engineering skills, including:

- Full-stack application development
- Secure authentication and session handling
- Third-party API integration
- Database modeling and CRUD flows
- UI/UX design for dashboards and data-heavy screens
- Background processing for repo scanning workflows
- AI-enabled product feature design
- Deployment-ready app structure

## Why recruiters should care

Code Sentinel is more than a demo app; it reflects the kind of product work that is valuable in modern software teams:

- It solves a real problem: keeping code quality visible
- It combines product, engineering, and AI thinking in one project
- It shows experience across frontend, backend, and system integration
- It demonstrates readiness to build tools that teams can actually use

The project is a strong example of someone who can take an idea from concept to a working, polished application with real-world architectural decisions.

## License

This project is currently provided as a portfolio project and is not formally licensed for commercial use unless otherwise stated.

## Contact

For collaboration or job opportunities, please connect via GitHub or reach out through the project owner profile.

---

Built with a focus on product value, code quality, and practical engineering execution.
