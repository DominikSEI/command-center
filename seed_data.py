"""
Command Center — Seed Script
Fügt alle Tracker-Projekte (inkl. Todos), Ideen und Monitor-Projekte ein.
Ausführen: python seed_data.py
Benötigt:  pip install requests
"""

import requests

# ─── Konfiguration ────────────────────────────────────────────
BASE_URL = "http://207.180.252.220/api"
USERNAME = "admin"
PASSWORD = "pcdsls32"
# ──────────────────────────────────────────────────────────────


def login() -> str:
    """POST /auth/login → access_token"""
    r = requests.post(f"{BASE_URL}/auth/login", json={
        "username": USERNAME,
        "password": PASSWORD,
    })
    r.raise_for_status()
    return r.json()["access_token"]


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ─── Cleanup ──────────────────────────────────────────────────

def cleanup(token: str):
    """
    Löscht alle Einträge in tracker_projects (inkl. Todos via Cascade),
    ideas und monitor-projects über die vorhandenen DELETE /{id} Endpoints.
    """
    # Tracker-Projekte (Todos werden per DB-Cascade mitgelöscht)
    r = requests.get(f"{BASE_URL}/tracker", headers=auth(token))
    r.raise_for_status()
    projects = r.json()
    for p in projects:
        requests.delete(f"{BASE_URL}/tracker/{p['id']}", headers=auth(token)).raise_for_status()
    print(f"  Tracker: {len(projects)} Projekte gelöscht")

    # Ideen
    r = requests.get(f"{BASE_URL}/ideas", headers=auth(token))
    r.raise_for_status()
    ideas = r.json()
    for i in ideas:
        requests.delete(f"{BASE_URL}/ideas/{i['id']}", headers=auth(token)).raise_for_status()
    print(f"  Ideas:   {len(ideas)} Einträge gelöscht")

    # Monitor-Projekte
    r = requests.get(f"{BASE_URL}/projects", headers=auth(token))
    r.raise_for_status()
    monitor = r.json()
    for p in monitor:
        requests.delete(f"{BASE_URL}/projects/{p['id']}", headers=auth(token)).raise_for_status()
    print(f"  Monitor: {len(monitor)} Projekte gelöscht")


# ─── Tracker ──────────────────────────────────────────────────

def create_tracker_project(token: str, name: str, description: str,
                            status: str, progress_percent: int,
                            notes: str = None) -> int:
    """
    POST /tracker  →  TrackerProjectCreate
      {name, description, status, progress_percent}
    PATCH /tracker/{id}  →  TrackerProjectUpdate  (notes only)
      {notes}
    Returns project id.
    """
    r = requests.post(f"{BASE_URL}/tracker", headers=auth(token), json={
        "name": name,
        "description": description,
        "status": status,
        "progress_percent": progress_percent,
    })
    r.raise_for_status()
    project_id = r.json()["id"]

    if notes:
        r2 = requests.patch(f"{BASE_URL}/tracker/{project_id}",
                            headers=auth(token), json={"notes": notes})
        r2.raise_for_status()

    return project_id


def add_todo(token: str, project_id: int, title: str):
    """POST /tracker/{project_id}/todos  →  TrackerTodoCreate  {title}"""
    r = requests.post(f"{BASE_URL}/tracker/{project_id}/todos",
                      headers=auth(token), json={"title": title})
    r.raise_for_status()


# ─── Ideen ────────────────────────────────────────────────────

def create_idea(token: str, title: str, body: str = None,
                status: str = None) -> int:
    """
    POST /ideas  →  IdeaCreate  {title, body}
    PATCH /ideas/{id}  →  IdeaUpdate  {status}   (if status != default "new")
    Returns idea id.
    """
    r = requests.post(f"{BASE_URL}/ideas", headers=auth(token), json={
        "title": title,
        "body": body,
    })
    r.raise_for_status()
    idea_id = r.json()["id"]

    if status and status != "new":
        r2 = requests.patch(f"{BASE_URL}/ideas/{idea_id}",
                            headers=auth(token), json={"status": status})
        r2.raise_for_status()

    return idea_id


# ─── Monitor-Projekte ─────────────────────────────────────────

def create_monitor_project(token: str, name: str, cluster: str,
                            check_type: str, url: str = None,
                            interval_minutes: int = 5,
                            alert_telegram: bool = True):
    """
    POST /projects  →  ProjectCreate
      {name, cluster, check_type, url, interval_minutes, alert_telegram}
    """
    r = requests.post(f"{BASE_URL}/projects", headers=auth(token), json={
        "name": name,
        "cluster": cluster,
        "check_type": check_type,
        "url": url,
        "interval_minutes": interval_minutes,
        "alert_telegram": alert_telegram,
    })
    r.raise_for_status()


# ─── Daten ────────────────────────────────────────────────────

TRACKER_PROJECTS = [
    {
        "name": "Heartlace",
        "status": "in_progress",
        "description": "KI-gestützte Hochzeitseinladungen — Brautpaare erstellen automatisiert personalisierte Einladungswebsites per AI. DACH-Markt.",
        "notes": "Domain bereits gekauft. Ggf. Namensänderung prüfen.",
        "progress_percent": 30,
        "todos": [
            "Website fertig bauen",
            "Neuen Namen überlegen (Domain bereits für alten Namen)",
            "Bezahlfunktion einbauen (Stripe)",
            "Ausgabe / Design überarbeiten",
            "Entscheiden: Generierung lokal oder auf Server",
            "Marketing starten — Zielgruppe Bräute / Hochzeitsplaner",
            "Demo-Einladung polieren",
        ],
    },
    {
        "name": "Quiftly",
        "status": "in_progress",
        "description": "QR-Code Gutschein-Quiz — Gutschein enthält QR Code, Scanner kommt auf KI-generiertes Quiz das zum Geschenk führt. Pay-per-use, 1€/Quiz.",
        "notes": "Vanilla JS + Netlify + Claude API. Grundstruktur steht.",
        "progress_percent": 20,
        "todos": [
            "Website komplett aufbauen",
            "Quiz-Generierung per Claude API fertigstellen",
            "Bezahlfunktion einbauen (Stripe)",
            "QR Code Erstellung automatisieren",
            "Landing Page + Marketing",
            "Pricing Seite",
            "Erste Testkäufer gewinnen",
        ],
    },
    {
        "name": "Aktienbot",
        "status": "in_progress",
        "description": "Selbst-verbessernder Aktien-Trading-Bot auf VPS 1. MT5 Integration. Ziel: Bot analysiert eigene Performance und optimiert Strategie autonom via Claude/Gemini.",
        "notes": "MT5 läuft nicht auf Linux — VPS 1 wird auf Windows umgerüstet.",
        "progress_percent": 15,
        "todos": [
            "VPS 1 auf Windows umrüsten",
            "MT5 auf VPS 1 installieren",
            "Bot-Grundstruktur auf VPS deployen",
            "Claude/Gemini API für Selbstoptimierung integrieren",
            "Backtesting Setup",
            "Risk Management Layer bauen",
            "Telegram Alerts für Bot-Status",
        ],
    },
    {
        "name": "Command Center",
        "status": "in_progress",
        "description": "Persönliches KI-Dashboard — überwacht alle Projekte, zeigt Stati, tägliches Briefing, Instagram Automation, Telegram Steuerung via OpenClaw.",
        "notes": "React + FastAPI + Supabase + Docker auf VPS 1.",
        "progress_percent": 55,
        "todos": [
            "Supabase Verbindung stabilisieren (Pooler URL)",
            "VPS-Metriken (CPU/RAM/Disk) anzeigen",
            "Telegram Alerts aktivieren und testen",
            "Daily Briefing: YouTube @AktienKanal + @everlastai via Gemini",
            "YouTube Data API Key einrichten",
            "Trading Dashboard iframe einbinden",
            "Domain + SSL einrichten (Subdomain)",
            "OpenClaw Integration (Phase 5)",
            "Instagram Content Automation (Phase 4)",
            "Auto-Deploy via GitHub Actions",
        ],
    },
    {
        "name": "Polymarket Bot",
        "status": "idea",
        "description": "Automatisierter Prediction-Market-Trading-Bot für Polymarket. KI analysiert Märkte, recherchiert via Web Search, platziert Wetten autonom. Python + Claude API + Gemini API.",
        "notes": "Lastenheft existiert. Polymarket Account + USDC + API Keys noch einrichten.",
        "progress_percent": 5,
        "todos": [
            "Polymarket Account erstellen + Wallet verbinden",
            "USDC auf Polygon Network einzahlen (50-100€ zum Testen)",
            "Polymarket API Keys generieren (Settings → API)",
            "py-clob-client installieren und testen",
            "Gamma API: Märkte scannen und filtern",
            "Claude API: Markt-Research und Scoring",
            "Risk Management Layer (max Position, Tages-Budget)",
            "Order Execution via CLOB Client",
            "Heartbeat an Command Center senden",
            "Telegram Alerts für Trades",
            "Reporting: P&L, offene Positionen",
        ],
    },
    {
        "name": "OpenClaw",
        "status": "idea",
        "description": "Persönlicher KI-Agent auf VPS 2. Steuert Command Center via Telegram, führt autonome Tasks aus, verbindet sich mit Obsidian Notes und anderen Tools.",
        "notes": "Auf VPS 2 installieren sobald verfügbar. Node.js basiert.",
        "progress_percent": 0,
        "todos": [
            "VPS 2 bereitstellen",
            "OpenClaw installieren (npm install -g openclaw)",
            "Telegram Channel verbinden",
            "SOUL.md konfigurieren (Persönlichkeit + Kontext)",
            "Skill: Dashboard Status abrufen",
            "Skill: Services neustarten",
            "Skill: Tägliches Briefing pushen",
            "Obsidian Notes Integration testen",
            "Sicherheit: OpenClaw nur read-only Zugriff auf Backend",
        ],
    },
]

IDEAS = [
    {
        "title": "Website-Erstellung für lokale Kleinbetriebe",
        "body": "Automatisierte Website + Instagram Content Generierung für lokale kleine Unternehmen (Handwerker, Physiotherapeuten, Verwaltung). KI erstellt Texte, Bilder, Posts. Monatliches Abo-Modell.",
        "status": "new",
    },
    {
        "title": "Videos automatisch analysieren",
        "body": "Tool das YouTube Videos (Gold, Aktien, KI-Themen) automatisch transkribiert, analysiert und zusammenfasst. Bereits teilweise im Command Center Briefing integriert.",
        "status": "in_review",
    },
    {
        "title": "Klamottenbrand",
        "body": "Eigene Klamotten-Marke. KI-generierte Designs, Print-on-Demand. Details noch offen.",
        "status": "new",
    },
    {
        "title": "KI-Schulungen anbieten",
        "body": "Schulungen für Unternehmen und Privatpersonen zum Thema KI-Tools, Automatisierung, Prompting. Evtl. unter der geplanten Firma NXLY.",
        "status": "new",
    },
    {
        "title": "Bayern KI API",
        "body": "KI-Schnittstelle speziell für bayerische Behörden / kommunale Verwaltung. Verbindung zu bestehenden Planungs-Projekten (Verkehrsmodell, Geländebauen).",
        "status": "new",
    },
    {
        "title": "Verkehrsmodell",
        "body": "KI-gestütztes Verkehrsmodell für kommunale Planung. Verbindung zu bestehendem Planungs-Background.",
        "status": "new",
    },
    {
        "title": "Geländebauen",
        "body": "Tool oder Service für automatisierte Geländemodellierung. Details noch offen.",
        "status": "new",
    },
    {
        "title": "Studium automatisieren",
        "body": "KI-Tools die Studium-Tasks automatisieren — Zusammenfassungen, Lernkarten, Prüfungsvorbereitung.",
        "status": "new",
    },
    {
        "title": "Newsticker Aktien",
        "body": "Automatisierter Newsticker speziell für Aktien-relevante Nachrichten. KI filtert und bewertet Relevanz. Evtl. als Feature im Command Center.",
        "status": "in_review",
    },
    {
        "title": "Produktfinder",
        "body": "Aggregator für Produkte über alle Plattformen und Kleinanzeigen. KI-gestützte Suche und Preisvergleich.",
        "status": "new",
    },
    {
        "title": "Immofinde",
        "body": "Immobilien-Aggregator der alle Portale zusammenfasst (ImmoScout, Immowelt, eBay Kleinanzeigen etc.). KI bewertet Angebote.",
        "status": "new",
    },
    {
        "title": "Peptide",
        "body": "Idee rund um Peptide — Details noch offen.",
        "status": "new",
    },
    {
        "title": "Rahmenplan",
        "body": "Übergeordneter Rahmenplan für alle KI-Projekte und die geplante Firma NXLY.",
        "status": "in_review",
    },
]

MONITOR_PROJECTS = [
    {
        "name": "Quiftly",
        "cluster": "Webapps",
        "check_type": "http",
        "url": "https://quiftly.netlify.app",
        "interval_minutes": 5,
        "alert_telegram": True,
    },
    {
        "name": "Command Center",
        "cluster": "Infrastruktur",
        "check_type": "http",
        "url": "http://207.180.244.172",
        "interval_minutes": 5,
        "alert_telegram": True,
    },
]


# ─── Ausführung ───────────────────────────────────────────────

if __name__ == "__main__":
    print("Logging in...")
    token = login()
    print("OK\n")

    print("Cleanup — bestehende Daten loeschen...")
    cleanup(token)
    print()

    print("Tracker-Projekte anlegen...")
    for p in TRACKER_PROJECTS:
        pid = create_tracker_project(
            token,
            name=p["name"],
            description=p["description"],
            status=p["status"],
            progress_percent=p["progress_percent"],
            notes=p.get("notes"),
        )
        print(f"  {p['name']} (id={pid})")
        for todo in p.get("todos", []):
            add_todo(token, pid, todo)
        print(f"    -> {len(p['todos'])} Todos")

    print("\nIdeen anlegen...")
    for idea in IDEAS:
        iid = create_idea(token, title=idea["title"],
                          body=idea.get("body"), status=idea.get("status"))
        print(f"  {idea['title']} (id={iid})")

    print("\nMonitor-Projekte anlegen...")
    for mp in MONITOR_PROJECTS:
        create_monitor_project(token, **mp)
        print(f"  {mp['name']}")

    print("\nFertig.")
