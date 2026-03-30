# Claude Code — Starter Prompt

Kopiere alles ab der Linie in Claude Code rein.

---

Wir bauen mein persönliches **Command Center** — ein selbst gehostetes Web-Dashboard
für alle meine KI-Projekte. Das Projekt liegt in:
`C:\Users\domin\Documents\04_Command-Center`

Hier ist das vollständige Lastenheft:

---

# Lastenheft: Personal Command Center

## 1. Projektziel

Ein persönliches Web-Dashboard das alle laufenden KI-Projekte, Services und Datenquellen
an einem Ort zusammenfasst. Zugriff von überall, passwortgeschützt, erreichbar über eine
eigene Domain. OpenClaw läuft als Agent-Layer auf demselben VPS und ermöglicht
Steuerung via Telegram. Gemini API übernimmt alle Daily-Briefing und Content-Tasks.

## 2. Rahmenbedingungen

| Eigenschaft | Wert |
|---|---|
| Hosting | Eigener VPS |
| Erreichbarkeit | Öffentliche Domain (z.B. `dashboard.domain.de`) |
| Zugang | Passwortschutz (JWT Login) |
| Versionierung | GitHub Repository |
| Zugriff | Von überall — Browser, Desktop + Mobile |
| Agent Layer | OpenClaw (auf demselben VPS) |
| AI: Reasoning | Claude API (Polymarket-Analyse, wichtige Entscheidungen) |
| AI: Briefing/Content | Gemini API (News, YouTube, Instagram Captions) |

## 3. Tech-Stack

| Komponente | Technologie |
|---|---|
| Frontend | React + Tailwind CSS (Vite) |
| Backend | Python FastAPI |
| Datenbank | SQLite (einfach, lokal, kein extra Service) |
| Auth | JWT (einfacher Login-Screen, kein OAuth) |
| Deployment | Docker Compose, Nginx Reverse Proxy, SSL via Let's Encrypt |
| CI/CD | GitHub Actions (auto-deploy bei Push auf main) |
| Agent | OpenClaw (Node.js, läuft als eigener Docker Container) |
| Alerting | Telegram Bot |

## 4. Architektur

```
Browser / Mobile
      │
      ▼
  Nginx (SSL, Domain)
      │
      ├──▶ React Frontend (Port 5173)
      └──▶ FastAPI Backend (Port 8000)
                │
                ├── SQLite
                ├── Health Check Scheduler (alle 5 Min)
                ├── Gemini API
                ├── Claude API
                └── Telegram Bot

OpenClaw — separater Container
      ├── liest Dashboard-Status via interner API
      ├── empfängt Befehle via Telegram
      └── kann Services neustarten
```

## 5. Module (Phasen)

### Phase 1 — Projekt-Monitor (MVP) ← JETZT BAUEN

- Karten-Layout, eine Karte pro Projekt
- Status: ✅ Online / ⚠️ Warning / ❌ Down
- Uptime-Prozentsatz (7 Tage)
- Klick auf Karte → Detail-Ansicht mit Fehlerlog
- Projekte in Clustern: Webapps / Bots / APIs / Infrastruktur
- Langfristig 10–20 Projekte

Check-Typen:
- HTTP Check (URL erreichbar?)
- Heartbeat (Service meldet sich aktiv)
- Custom JSON (Endpoint gibt Status zurück)
- SSL Check (Zertifikat gültig?)

Alerting:
- Bei ❌ → Telegram-Nachricht
- Bei Recovery → Telegram-Nachricht
- Tägliche Zusammenfassung 08:00 Uhr

VPS-Metriken:
- CPU, RAM, Disk, Netzwerk
- Alle 5 Min in SQLite

### Phase 1b — Projekt-Tracker

- Bereich "In Arbeit" im Dashboard
- Karten mit Fortschrittsbalken (%)
- Klick → Untermenü mit offenen To-dos
- Status-Stufen: Idee / In Arbeit / Review / Live
- Manuell pflegbar im Dashboard

### Phase 2 — Trading Dashboard (später)
- Bestehendes React-Dashboard via iframe einbetten
- Tab "Trading" im Command Center

### Phase 3 — Daily Briefing via Gemini (später)
- YouTube Transkripte + RSS Feeds
- Gemini Flash fasst zusammen
- Morgens 07:00 Uhr Cron + Telegram Push

### Phase 4 — Instagram Content-Automatisierung (später)
- Gemini generiert Captions
- fal.ai für Bilder
- Approval-Flow im Dashboard

### Phase 5 — OpenClaw Integration (später)
- Telegram-Befehle: status, restart, briefing, kosten, vps
- Read-only Zugriff auf Backend

## 6. Sicherheit

- HTTPS (Let's Encrypt)
- JWT Auth, Session 24h
- Secrets nur in .env, nie im Repo
- .env.example mit Platzhaltern
- Nginx Rate Limiting auf Login

## 7. Repo-Struktur

```
command-center/
├── frontend/
│   └── src/
│       ├── components/
│       └── pages/
│           ├── Dashboard.jsx
│           ├── Tracker.jsx
│           ├── Trading.jsx
│           ├── Briefing.jsx
│           └── Content.jsx
├── backend/
│   ├── main.py
│   ├── routes/
│   ├── services/
│   │   ├── checker.py
│   │   ├── gemini.py
│   │   ├── claude.py
│   │   └── telegram.py
│   ├── models.py
│   └── requirements.txt
├── openclaw/
│   ├── SOUL.md
│   └── skills/
├── nginx/default.conf
├── docker-compose.yml
├── .env.example
├── .github/workflows/deploy.yml
└── README.md
```

## 8. Beispiel Projekt-Config (in DB, nicht hardcoded)

```json
{ "name": "Heartlace", "cluster": "Webapps", "type": "http", "url": "https://heartlace.com", "interval_minutes": 5, "alert_telegram": true }
{ "name": "Polymarket Bot", "cluster": "Bots", "type": "heartbeat", "expected_interval_minutes": 10, "alert_telegram": true }
```

---

## Aufgabe für jetzt — Phase 1:

Bitte starte mit dem kompletten Grundgerüst:

1. Repo-Struktur anlegen
2. `docker-compose.yml` mit Frontend, Backend, Nginx
3. FastAPI Backend:
   - SQLite Setup mit Models (Projects, CheckResults, VpsMetrics, TrackerProjects, TrackerTodos)
   - JWT Auth (Login-Endpoint, Token-Validierung)
   - Projects CRUD (Projekte anlegen, bearbeiten, löschen)
   - Health Check Scheduler (APScheduler, alle 5 Min)
   - HTTP + Heartbeat Check implementieren
   - Telegram Alert Service (Grundgerüst, Token aus .env)
4. React Frontend (Vite + Tailwind):
   - Login-Screen
   - Sidebar Navigation (Monitor / Tracker / Trading / Briefing / Content / VPS)
   - Dashboard-Seite: Projekt-Karten gruppiert nach Cluster, Status-Dots, Uptime
   - Klick auf Karte → Detail-Drawer mit Fehlerlog
   - Tracker-Seite: Projekt-Karten mit Fortschrittsbalken, Klick → Todo-Liste
5. `.env.example` mit allen nötigen Keys
6. `README.md` mit Setup-Anleitung

Design-Referenz: Cleanes Dark/Light-fähiges Dashboard, Tailwind,
ähnlich dem Mockup das wir besprochen haben —
Sidebar links, Metriken oben, Karten-Grid darunter.

Fang mit der Struktur an, dann Backend, dann Frontend.
Frage mich wenn du Entscheidungen brauchst.
