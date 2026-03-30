# Lastenheft: Personal Command Center

## 1. Projektziel

Ein persönliches Web-Dashboard das alle laufenden KI-Projekte, Services und Datenquellen
an einem Ort zusammenfasst. Zugriff von überall, passwortgeschützt, erreichbar über eine
eigene Domain. OpenClaw läuft als Agent-Layer auf demselben VPS und ermöglicht
Steuerung via Telegram. Gemini API übernimmt alle Daily-Briefing und Content-Tasks.

---

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

---

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

---

## 4. Architektur-Übersicht

```
Browser / Mobile
      │
      ▼
  Nginx (SSL, Domain)
      │
      ├──▶ React Frontend (Port 5173)
      │         │
      │         ▼
      └──▶ FastAPI Backend (Port 8000)
                │
                ├── SQLite (Status-History, Logs)
                ├── Health Check Scheduler (alle 5 Min)
                ├── Gemini API (Briefing, News, Content)
                ├── Claude API (Trading-Analyse)
                └── Telegram Bot (Alerts raus)

OpenClaw (Port 18789) — separater Container
      │
      ├── liest Dashboard-Status via interner API
      ├── empfängt Befehle via Telegram
      └── kann Services auf dem VPS neustarten
```

---

## 5. Module & Phasen

---

### Phase 1 — Projekt-Monitor (MVP)

**Ziel:** Sofortiger Überblick ob alle Projekte noch laufen.

#### 5.1 Dashboard-Übersicht

- Karten-Layout, eine Karte pro Projekt
- Status-Indikator: ✅ Online / ⚠️ Warning / ❌ Down
- Letzter Check-Zeitpunkt
- Uptime-Prozentsatz (7 Tage rolling)
- Klick auf Karte → Detail-Ansicht mit Fehlerlog (letzte 20 Events)
- Projekte gruppiert in Cluster (z.B. "Webapps", "Bots", "APIs", "Infrastruktur")
- Langfristig: 10–20 Projekte

#### 5.2 Check-Typen

| Typ | Beschreibung | Beispiel |
|---|---|---|
| HTTP Check | GET Request, erwartet 200 | Heartlace, Quiftly |
| Heartbeat | Service meldet sich aktiv (Push) | Polymarket Bot alle 10 Min |
| Process Check | Läuft PID/Prozessname auf VPS | Python Trading Bot |
| Custom JSON | Endpoint gibt `{"status": "ok", ...}` zurück | Bot-Status mit letztem Trade |
| SSL Check | Zertifikat gültig + wie lange noch | Alle Domains |

#### 5.3 Alerting via Telegram

- Bei Status-Wechsel zu ❌ → sofortige Telegram-Nachricht
- Bei Status-Wechsel zurück zu ✅ → "Recovered" Nachricht
- Tägliche Zusammenfassung um 08:00 Uhr (alle Stati)
- Telegram-Nachrichten kommen vom OpenClaw-Agent

#### 5.4 VPS-Metriken

- CPU-Auslastung (aktuell + 24h Chart)
- RAM-Nutzung
- Disk-Nutzung
- Netzwerk I/O
- Wird alle 5 Minuten gesammelt und in SQLite gespeichert

---

### Phase 2 — Trading Dashboard Integration

**Ziel:** Bestehendes Polymarket Trading Dashboard einbinden.

- Eigener Tab "Trading" im Command Center
- Bestehendes React-Dashboard eingebettet via iframe
- Alternativ: API des Trading Backends direkt abfragen und
  native Widgets im Command Center anzeigen (schönere Integration)
- Anzeige:
  - Offene Positionen
  - P&L (heute / gesamt)
  - Letzte Trades
  - Bot-Status (läuft / gestoppt / letzter Run)
  - API-Kosten (Claude + Gemini, täglich)

---

### Phase 3 — Daily Briefing (Gemini)

**Ziel:** Jeden Morgen automatisch eine Zusammenfassung relevanter Infos.

#### Quellen
- YouTube Kanäle (Transkripte via YouTube Data API)
- RSS Feeds (AI-News, Finanz-News, Crypto)
- Polymarket Top-Märkte (was bewegt sich gerade)

#### Ablauf (täglich 07:00 Uhr Cron)
1. YouTube Transkripte der letzten 24h abrufen
2. RSS Feeds aggregieren
3. Alles an Gemini Flash schicken
4. Strukturierte Zusammenfassung in SQLite speichern
5. Im Dashboard anzeigen (eigener "Briefing" Tab)
6. Via Telegram als Morgen-Nachricht pushen

#### Gemini-Nutzung
- Modell: `gemini-2.0-flash` (günstig, 1M Token Context)
- Ideal für lange YouTube-Transkripte
- Tageskosten geschätzt: < 0,10 €

---

### Phase 4 — Content-Automatisierung (Gemini)

**Ziel:** Instagram-Kanäle automatisch mit Inhalten bespielen.

- Quellen: Briefing-Zusammenfassungen, eigene Projektmeilensteine
- Gemini generiert Caption + Hashtags
- Bild-Generierung: fal.ai
- Posting: Instagram Graph API (Meta Business Account nötig)
- Approval-Flow: Entwurf erscheint im Dashboard,
  Bestätigung via Telegram ("posten" / "überspringen")
- Zeitplan: 1x täglich pro Kanal, konfigurierbarer Zeitpunkt

---

### Phase 5 — OpenClaw Integration

**Ziel:** Steuerung des Command Centers via Telegram-Chat.

#### Verfügbare Befehle via Telegram
- `status` → Übersicht aller Projekte
- `status heartlace` → Detail eines Projekts
- `restart bot` → Polymarket Bot neustarten (mit Bestätigung)
- `briefing` → Heutiges Briefing als Nachricht
- `kosten` → API-Kosten heute
- `vps` → CPU/RAM/Disk Status

#### Sicherheit
- OpenClaw hat keinen direkten Zugriff auf API-Keys oder Wallet-Daten
- Kommuniziert nur mit dem internen FastAPI Backend (read-only + wenige Actions)
- Läuft im eigenen Docker-Netzwerk, nicht öffentlich erreichbar

---

## 6. Sicherheit

- HTTPS überall (Let's Encrypt via Certbot)
- JWT Auth mit Refresh Tokens (Session läuft nach 24h ab)
- Alle Secrets in `.env` Datei, nie im Git-Repo
- `.env.example` im Repo mit Platzhaltern
- GitHub Actions Secrets für CI/CD
- Nginx Rate Limiting auf Login-Endpoint

---

## 7. GitHub Repository Struktur

```
command-center/
├── frontend/                  # React + Tailwind
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx      # Projekt-Monitor
│   │   │   ├── Trading.jsx        # Trading iframe + Widgets
│   │   │   ├── Briefing.jsx       # Daily Briefing
│   │   │   └── Content.jsx        # Instagram Queue
│   │   └── App.jsx
│   └── package.json
│
├── backend/                   # Python FastAPI
│   ├── main.py
│   ├── routes/
│   │   ├── projects.py
│   │   ├── vps.py
│   │   ├── briefing.py
│   │   └── content.py
│   ├── services/
│   │   ├── checker.py         # Health Check Scheduler
│   │   ├── gemini.py          # Gemini API Wrapper
│   │   ├── claude.py          # Claude API Wrapper
│   │   └── telegram.py        # Alert Sender
│   ├── models.py
│   └── requirements.txt
│
├── openclaw/                  # OpenClaw Config + Skills
│   ├── SOUL.md
│   └── skills/
│       ├── dashboard-status.md
│       └── restart-service.md
│
├── nginx/
│   └── default.conf
├── docker-compose.yml
├── .env.example
├── .github/
│   └── workflows/
│       └── deploy.yml
└── README.md
```

---

## 8. Projekt-Konfiguration (Beispiel)

Projekte werden in der DB verwaltet und im Dashboard konfiguriert — kein Hardcoding.

```json
{
  "name": "Heartlace",
  "cluster": "Webapps",
  "type": "http",
  "url": "https://heartlace.com",
  "interval_minutes": 5,
  "alert_telegram": true
}
```

```json
{
  "name": "Polymarket Bot",
  "cluster": "Bots",
  "type": "heartbeat",
  "expected_interval_minutes": 10,
  "alert_telegram": true
}
```

---

## 8b. Zusatz: Projekt-Tracker (Kanban/Status)

- Eigener Bereich "In Arbeit" im Dashboard
- Karten pro Projekt mit Fortschrittsbalken (% manuell oder aus offenen Punkten berechnet)
- Klick auf Karte → Untermenü mit offenen To-dos / Meilensteinen
- Status-Stufen: Idee / In Arbeit / Review / Live
- Manuell pflegbar im Dashboard (kein externes Tool nötig)
- Optional später: GitHub Issues als Datenquelle

---

## 9. Offene Punkte

- [ ] Domain für das Dashboard festlegen
- [ ] Welche YouTube-Kanäle ins Briefing?
- [ ] Welche Instagram-Kanäle automatisieren?
- [ ] Hat der Polymarket Bot bereits einen Status-Endpoint?
- [ ] OpenClaw: bestehenden Anthropic-Key verwenden?

---

## 10. Entwicklungs-Reihenfolge

1. Repo aufsetzen, Docker Compose, Nginx, Domain, SSL
2. FastAPI Backend Grundgerüst + SQLite
3. JWT Auth
4. Erste Health Checks (HTTP + Heartbeat)
5. React Frontend — Dashboard mit Projekt-Karten
6. Telegram Alerting
7. VPS-Metriken
8. Trading iframe einbinden
9. Gemini Briefing (Cron + Frontend Tab)
10. OpenClaw einbinden + Skills schreiben
11. Instagram Content-Queue
