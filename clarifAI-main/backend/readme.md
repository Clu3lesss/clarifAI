<<<<<<< HEAD
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
=======
# Nexus Hackathon — Deepfake Detection Backend

This is the Node.js backend for the Deepfake Detection project built for the Nexus Hackathon. It provides a RESTful API for user authentication, image uploading, and interacts with a Python ML Service for inference.

## Tech Stack
- **Node.js** & **Express.js** (Web framework)
- **MongoDB** & **Mongoose** (Database)
- **JWT** (Authentication)
- **Multer** (File uploads)
- **Jest** & **Supertest** (Testing)

## Getting Started

### 1. Prerequisites
- Node.js (v18+ recommended)
- MongoDB running locally or on MongoDB Atlas
- Python ML Service running on `http://localhost:8000` (by default)

### 2. Setup

1. Clone this repository.
2. Run `npm install` to install dependencies.
3. Copy `.env.example` to `.env` and fill in your values (MongoDB URI, JWT Secrets, etc.).
   ```bash
   cp .env.example .env
   ```

### 3. Running the Server
**Development Mode** (with nodemon):
```bash
npm run dev
```

**Production Mode**:
```bash
npm start
```

### 4. Running Tests
Tests use a separate in-memory or local test database.

```bash
npm test
```

## API Endpoints Overview

- **Authentication (`/api/auth`)**
  - `POST /register`: Create a new user
  - `POST /login`: Authenticate and receive tokens
  - `POST /refresh`: Get new access token
  - `GET /me`: Get current user profile

- **Detection (`/api/detection`)** - *Requires Authentication*
  - `POST /predict`: Upload image for deepfake detection (multipart/form-data)
  - `GET /result/:id`: Fetch specific detection results
  - `GET /history`: Fetch paginated history of past detections

- **Health (`/health`)**
  - `GET /`: Returns API, Database, and ML Service health status.

## Collaboration Guidelines
- Create a new branch for each feature: `git checkout -b feature/your-feature-name`
- Ensure tests pass before pushing: `npm test`
- Do not commit your `.env` file or the `uploads/` directory.
>>>>>>> df98e93 (Initial commit: Nexus Hackathon Deepfake Backend)
