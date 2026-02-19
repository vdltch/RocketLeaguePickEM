# Rocket League Pick em

Projet React moderne pour suivre l'e-sport Rocket League et faire des pronostics Pick em.

## Stack

- React 19 + TypeScript
- Vite 7
- React Router
- TanStack Query
- Zustand (persist localStorage)
- Lucide React + CSS custom
- Express API
- SQLite (BDD locale)
- JWT + bcrypt (auth)

## Scripts

- `npm run dev` : lance l'app en local
- `npm run dev:client` : frontend seul
- `npm run dev:server` : backend seul
- `npm run server` : backend en mode normal
- `npm run build` : build production
- `npm run preview` : preview du build
- `npm run lint` : lint ESLint

## Environnement

Copier `.env.example` vers `.env` puis ajuster si besoin.

- `PORT=4000`
- `CLIENT_ORIGIN=http://localhost:5173`
- `JWT_SECRET=change-me-in-production`
- `VITE_API_URL=http://localhost:4000/api`
- `RESULTS_SYNC_INTERVAL_MS=120000` (sync auto Liquipedia des résultats)

## Deployment Proxmox (Ubuntu 22.04)

Script de setup complet:

`scripts/proxmox-ubuntu22-setup.sh`

Exemple d'utilisation sur la VM:

```bash
sudo bash scripts/proxmox-ubuntu22-setup.sh \
  --app-dir /var/www/html/rocketleague-pickem \
  --app-user ubuntu \
  --domain _ \
  --results-sync-ms 120000
```

Pré-requis:

- le code du projet doit déjà être présent dans `--app-dir`
- lancer en `root/sudo`

## Fonctionnalites

- Accueil e-sport Rocket League
- Liste des tournois et matchs
- Module Pick em interactif (selection vainqueurs)
- Pages `Login` / `Register`
- Sauvegarde des picks en BDD par utilisateur
- Classement communautaire avec ton score
- Page actualites
