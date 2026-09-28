# SIH Team — DocGuard

A responsive frontend for **DocGuard**, a secure digital document-management workspace designed for legal, investigation, compliance, and administrative teams.

The interface demonstrates how legal records, cases, audit activity, permissions, and document-integrity information can be presented in a calm, professional legal-tech product.

> **Demo Scope:** This repository is currently a frontend prototype using mock data. Labels such as encryption, integrity verification, and blockchain status are UI states only. They do not provide real cryptographic protection or verification until connected to a backend.

---

## Highlights

* Premium, responsive legal-tech dashboard
* Desktop sidebar and mobile drawer navigation
* Document listing, type badges, action menus, and document-detail view
* Upload dropzone with drag-over, file-size error, progress, and success states
* Case dashboard with filtering and investigation metadata
* Advanced search interface and result table
* Audit trail, users/access, and settings screens
* Loading skeletons, empty states, confirmation dialogs, toast notifications, and keyboard search shortcut (`Ctrl + K`)
* Subtle Framer Motion micro-interactions and accessible focus styles
* Mock data and a clear service layer ready to be replaced with API calls

---

## Tech Stack

* React
* Vite
* Tailwind CSS
* Framer Motion
* Lucide React
* CSS Custom Design System

---

## Getting Started

### Prerequisites

Make sure you have the following installed:

* Node.js 20 or newer
* npm 10 or newer

### Installation and Running the Project

```bash
npm install
npm run dev
```

Vite will display the local development URL, normally:

```text
http://localhost:5173
```

### Phone OTP for Sign-up

Sign-up verification is sent to the supplied phone number by the backend SMS gateway. For local demos, enable the fixed OTP:

1. Copy `backend/.env.example` to `backend/.env`.
2. Set `OTP_DEMO_MODE=true` only for local development. The demo accepts `123456` for each active OTP verification session and does not send SMS. The backend only enables this setting when `APP_ENV=development`.
3. For real SMS delivery, leave `OTP_DEMO_MODE=false` and configure the SMS provider credentials in `backend/.env`.
4. Start the backend from the `backend` directory:

   ```bash
   python -m uvicorn app.main:app --reload --port 8000
   ```

5. Start Vite from the repository root with `npm run dev`.

The demo OTP is not a substitute for real phone verification and is never enabled by `OTP_DEMO_MODE` in production. It only verifies an active OTP challenge; it does not bypass password or face authentication during sign-in.

### Production Build

```bash
npm run build
npm run preview
```

---

## Project Structure

```text
.
├── src/
│   ├── assets/
│   │   └── justice-panel.png       # Dashboard legal-themed visual
│   ├── services/
│   │   └── mockData.js             # Temporary data; replace with API services
│   ├── main.jsx                    # Application, reusable UI components, screens
│   └── styles.css                  # Design system and responsive styles
├── index.html
├── package.json
├── tailwind.config.js
└── vite.config.js
```

---

## Main Screens

| Screen          | Purpose                                                                                 |
| --------------- | --------------------------------------------------------------------------------------- |
| Dashboard       | Overview of documents, cases, activity, quick actions, and upload handling              |
| Documents       | Searchable document inventory with contextual actions                                   |
| Document Detail | Metadata, access information, audit events, and mock integrity status                   |
| Upload          | Secure upload UI demonstration with validation states                                   |
| Cases           | Case cards, status filtering, priority, assigned investigator, and document counts      |
| Search          | Advanced filter layout for finding documents and cases                                  |
| Audit Log       | Timestamped activity history with user, action, source, device, and result              |
| Users & Access  | Team member roles, departments, access levels, and status                               |
| Settings        | Profile, security, notifications, access control, audit, and system preference settings |

---

## Team Workflow

1. Create a branch from `main` for each focused change.
2. Use a descriptive branch name, for example:

   * `feature/case-filters`
   * `fix/mobile-table-scroll`
3. Run `npm run build` before opening a pull request.
4. Keep pull requests focused and describe both UI and behavior changes.
5. Request a teammate review before merging into `main`.

### Suggested Commit Format

```text
feat: add case priority filters
fix: keep document actions within mobile table scroll area
docs: clarify local setup
```

---

## Replacing Mock Data with an API

The current sample data lives in:

```text
src/services/mockData.js
```

When backend endpoints are available:

1. Create API modules beside it, for example:

   * `src/services/documents.js`
   * `src/services/cases.js`
2. Move network calls and data transformation into those modules.
3. Keep components focused on presentation and UI state.
4. Add real loading, empty, unauthorized, and error handling for every endpoint.
5. Never expose secrets, API tokens, hashes, or permissions in the client bundle.

### Example Service

```js
export async function getDocuments(filters) {
  const response = await fetch('/api/documents')

  if (!response.ok) {
    throw new Error('Could not load documents')
  }

  return response.json()
}
```

---

## Security Notes

* This frontend must not be considered the security boundary.
* Document encryption, access control, audit immutability, hashing, and blockchain verification must be implemented and enforced by trusted backend services.
* Authenticate requests on the server and verify authorization for every document and case action.
* Do not store sensitive document contents, credentials, or access tokens in source code or insecure browser storage.
* Validate file type, file size, malware status, and permissions on the server before accepting uploads.

---

## Design Principles

* Professionalism over decoration
* Strong contrast and clear visual hierarchy
* Calm navy, white, muted blue, and restrained success/warning colors
* Responsive layouts that preserve document-table usability on smaller screens
* Small, purposeful animations only

---

## Available Commands

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the Vite development server    |
| `npm run build`   | Build production assets              |
| `npm run preview` | Preview the production build locally |

---

## License

Add the team's selected license before public distribution.

Keep the repository private while it contains prototype work, proprietary assets, or investigation-related material.
