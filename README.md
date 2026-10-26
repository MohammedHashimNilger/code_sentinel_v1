# Code Sentinel

<p align="center">
  <a href="https://code-sentinel-v1-five.vercel.app/" target="_blank">
    <img src="https://img.shields.io/badge/Live%20Demo-Open%20Application-0A66C2?style=for-the-badge&logo=vercel" alt="Live Demo" />
  </a>
  <img src="https://img.shields.io/badge/Stack-React%20%7C%20Node.js%20%7C%20MongoDB-0A0F2C?style=for-the-badge" alt="Tech Stack" />
  <img src="https://img.shields.io/badge/Type-AI%20Powered%20Portfolio%20Project-FF6B6B?style=for-the-badge" alt="AI Powered Portfolio Project" />
</p>

Code Sentinel is an AI-assisted repository health monitoring platform built to help developers and teams understand the health of their GitHub projects in real time. The application connects to GitHub repositories, evaluates code quality signals, tracks project trends over time, and surfaces actionable issues through an intuitive dashboard.

This project was designed to demonstrate full-stack product engineering, API integration, data visualization, and AI-enabled workflow design in a single SaaS-style application.

## Live Demo

- Production URL: https://code-sentinel-v1-five.vercel.app/

## Why this project matters

Code Sentinel addresses a real developer pain point: code quality and repository health are often difficult to monitor at a glance, especially across multiple repositories and teams. The platform brings those signals into one place so engineering leads, contributors, and stakeholders can quickly understand project health, identify risk areas, and act on meaningful issues.

## Key features

- GitHub repository integration and authentication
- Repository health scoring with severity-based issue breakdowns
- Automated scan workflow for analyzing repository health
- Trend tracking across multiple scan cycles
- AI-assisted semantic review for deeper code insights
- Dashboard-based visualization of repository status
- PDF report generation for stakeholder sharing
- Full-stack SaaS-style experience built end-to-end

## Tech stack

### Frontend
- React
- Vite
- React Router
- Tailwind CSS
- Recharts
- Tabler icons

### Backend
- Node.js
- Express
- MongoDB
- JWT-based authentication
- GitHub OAuth / GitHub API integration
- PDF generation with PDFKit

### Additional capabilities
- AI-powered review workflow support
- Data-driven dashboard analytics
- Real-time repository monitoring experience

## Architecture overview

The application is structured into two main services:

- Frontend: repository dashboards, health overview pages, and user-facing analytics
- Backend: authentication, repository management, scan orchestration, AI review flows, and report generation

The backend handles persistence of connected repositories, scan results, and issue metadata in MongoDB while communicating with GitHub to collect repository details and monitoring context.

## How it works

1. User signs in with GitHub.
2. A repository is connected from the dashboard.
3. The system tracks the repository and prepares a monitoring workflow.
4. A health scan evaluates code quality and identifies issues.
5. Results are stored and visualized in the user interface.
6. Users can review findings, trigger AI-assisted analysis, and export reports.

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
├── README.md
└── package.json
```

## Getting started locally

### Prerequisites

- Node.js 18+
- MongoDB instance
- GitHub account with OAuth app credentials

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

Create a `.env` file in the `backend/` directory with the required variables:

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

Start the backend:

```bash
npm run dev
```

### 3. Set up the frontend

```bash
cd ../frontend
npm install
```

Create a `.env` file in the `frontend/` directory if needed:

```env
VITE_API_URL=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
```

## Skills demonstrated

This project showcases a strong combination of product thinking and engineering execution, including:

- Full-stack web application development
- Secure authentication and session management
- Third-party API integration with GitHub
- Database modeling and data persistence with MongoDB
- UI/UX design for dashboards and data-heavy interfaces
- Analytics and reporting workflows
- AI-enabled product feature design
- Deployment-ready app structure and production thinking

## Why this is a strong portfolio project

Code Sentinel is a practical, product-oriented application that reflects how modern software teams use data, automation, and AI to improve developer workflows. It demonstrates the ability to build a polished, end-to-end system that connects user experience, system design, integrations, and intelligent analysis into one unified product.

## Contact

For collaboration or opportunities, connect with me on GitHub:

- GitHub: https://github.com/MohammedHashimNilger

---

Built as a portfolio project to showcase product thinking, full-stack development, and AI-powered application design.
