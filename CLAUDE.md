# audi-dashboard

**Entiteit:** prive · **GitHub:** dirkteur-git/audi-dashboard · **Status:** ? · **Draait op:** –

Lees eerst `C:\DEV\CLAUDE.md` (entiteiten en regels). Dit bestand gaat alleen over deze repo.

## Wat het is

Rittenregistratie voor de Audi. Een Python-dienst (`audi_service.py`, met `audiapi`) leest elk kwartier de kilometerstand en positie uit en maakt daar ritten van in SQLite. Een Vue-dashboard met Express-server toont de ritten. Hoort bij de groep `prive\auto\`, naast `vondr_kilometers`.

## Starten, testen, bouwen

```
npm install
pip install -r requirements.txt
npm run dev:all     # Vite-frontend en server samen
npm run server      # alleen de server (server/index.js, poort uit PORT, standaard 3002)
npm run build       # vue-tsc en vite build
npm start           # build en server
python audi_service.py
```

Geen tests.

## Opbouw

- `audi_service.py` haalt de autogegevens op en maakt ritten; synct ook op verzoek via `server/.sync_requested`
- `server/index.js` Express-API op de database `server/audi.db`
- `src/` Vue-frontend: pagina's Dashboard, Trips, Settings
- `public/` statische bestanden

## Regels voor deze repo

- **Geheimen:** `server/.env` met `PORT` (zie `server/.env.example`). De myAudi-login (gebruikersnaam, wachtwoord, VIN) staat in de database via de pagina Settings. Waarden uit Bitwarden; `.env` en `*.db` staan nooit in git.
- **Branch en pushen:** `master`. Committen en pushen naar master mag.
- De repo is **publiek** op GitHub. Zet er geen ritten, posities of andere persoonlijke data in.

## Open punten

- Dubbel werk (T-0039): `prive\homebase\Audi` is een latere versie van deze app (server als `index.cjs`, andere `audi_service.py`). Welke blijft?
- Status en waar het draait zijn onbekend (register: `?`, `–`).
- Het myAudi-wachtwoord staat leesbaar in SQLite, niet in Bitwarden.
- Moet deze repo publiek blijven?
