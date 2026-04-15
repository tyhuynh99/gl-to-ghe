# GitLab to GitHub Enterprise Migration Dashboard

A modern, interactive Web UI designed to assist with bulk-migrating Code, Variables, Issues, Merge Requests, Wikis, and Pipelines from a self-hosted GitLab instance to GitHub Enterprise Cloud.

## 🚀 Features

- **Premium Web Interface:** Built on **Next.js** with a clean, minimalist design.
- **Selective Migration:** Choose precisely what you want to migrate (Code, Variables, Issues, etc.).
- **Live Monitoring:** Real-time log streaming using Server-Sent Events (SSE) so you can monitor git push/pull and API status directly from the UI.
- **User Mapping:** Easily map GitLab users to GitHub Enterprise users.
- **Docker-Ready:** Execute seamlessly across multiple environments via the provided Dockerfile.

## 📦 Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js `20.9.0` or higher (If running without Docker)
- Personal Access Tokens (PATs) for both your GitLab and GitHub Enterprise accounts.

### Quick Start (Docker)

We recommend using the included Bash script to build and automatically launch the dashboard on port `3000`.

```bash
chmod +x start.sh
./start.sh
```

Navigate to `http://localhost:3000` to access the Dashboard. You can input your Tokens directly into the UI!

### Manual Setup (Local Node.js)

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```

---

## 🧪 Testing with a Local GitLab Instance

Don't want to test on your production GitLab server? We have included a `docker-compose.yml` optimized for running a local GitLab CE instance.

1. Navigate to the `gitlab-local` directory and start it up:
   ```bash
   cd gitlab-local
   docker compose up -d
   ```
   *(Note: The GitLab container might take 3-5 minutes to become fully healthy).*

2. Retrieve your initial root password:
   ```bash
   docker exec -it gitlab-local-gitlab-1 grep 'Password:' /etc/gitlab/initial_root_password
   ```

3. Open `http://localhost:8080`, log in using `root` and the password from above.

4. Create an Access Token in GitLab (`Profile > Preferences > Access Tokens`), create some dummy projects, open the Migration Dashboard (`http://localhost:3000`), and migrate away!

---

## 🏗 Project Architecture

- `app/page.js`: The frontend React component (Dashboard).
- `app/api/migrate/route.js`: The backend Next.js API orchestrator utilizing SSE.
- `src/modules/*`: Migration logic for specific features (Git Mirroring, Issues, Variables).
- `src/utils/*`: Custom GitLab and GitHub wrapper clients.

## 🔒 Security

* All credentials are sent over JSON boundaries directly to the server side and never persisted to a database.
* GitLab Masked Variables are explicitly decrypted locally (if needed) and moved to **GitHub Actions Encrypted Secrets** using `libsodium-wrappers`.
