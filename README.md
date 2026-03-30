# Command Center

Persönliches Web-Dashboard für KI-Projekte, Services und Infrastruktur.

## Stack

- **Frontend**: React + Tailwind CSS (Vite)
- **Backend**: Python FastAPI
- **Datenbank**: SQLite
- **Auth**: JWT (24h Session)
- **Deployment**: Docker Compose + Nginx

## Lokales Setup (Dev)

### 1. Repository klonen

```bash
git clone https://github.com/DEIN_USER/command-center.git
cd command-center
```

### 2. Umgebungsvariablen

```bash
cp .env.example .env
# .env bearbeiten: Passwort, JWT Secret, Telegram Token setzen
```

JWT Secret generieren:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### 3. Backend lokal starten

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

API läuft auf http://localhost:8000 — Swagger UI: http://localhost:8000/docs

### 4. Frontend lokal starten

```bash
cd frontend
npm install
npm run dev
```

Dashboard läuft auf http://localhost:5173

---

## Production Deployment (VPS)

### Voraussetzungen

- Docker + Docker Compose installiert
- Domain auf VPS-IP zeigend
- SSH-Zugang

### 1. Repo auf VPS klonen

```bash
git clone https://github.com/DEIN_USER/command-center.git ~/command-center
cd ~/command-center
cp .env.example .env
nano .env  # Werte eintragen
```

### 2. SSL Zertifikat

```bash
apt install certbot
certbot certonly --standalone -d dashboard.yourdomain.de
```

`nginx/default.conf` anpassen — HTTPS-Block einkommentieren und Domain eintragen.

### 3. Starten

```bash
docker compose up -d --build
```

Dashboard läuft auf https://dashboard.yourdomain.de

### CI/CD (GitHub Actions)

GitHub Repository Secrets setzen:
- `VPS_HOST` — IP oder Hostname
- `VPS_USER` — SSH-Benutzer (z.B. `root`)
- `VPS_SSH_KEY` — privater SSH-Key

Bei jedem Push auf `main` wird automatisch deployed.

---

## Projekt hinzufügen

Im Dashboard → "Projekt" klicken. Beispiele:

```json
{ "name": "Heartlace", "cluster": "Webapps", "check_type": "http", "url": "https://heartlace.com" }
{ "name": "Polymarket Bot", "cluster": "Bots", "check_type": "heartbeat", "expected_interval_minutes": 10 }
```

### Heartbeat-Endpoint

Services, die per Heartbeat überwacht werden, müssen regelmäßig pingen:

```
POST /api/projects/{project_id}/heartbeat
```

---

## Phasen

| Phase | Inhalt | Status |
|---|---|---|
| 1 | Projekt-Monitor (HTTP, Heartbeat, SSL, JSON) | ✅ MVP |
| 1b | Projekt-Tracker mit Todos | ✅ MVP |
| 2 | Trading-Dashboard (iframe) | Ausstehend |
| 3 | Daily Briefing via Gemini | Ausstehend |
| 4 | Instagram Content-Automatisierung | Ausstehend |
| 5 | OpenClaw Integration | Ausstehend |
