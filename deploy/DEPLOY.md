# CertiChain Production Deployment

Three pieces, three providers:

| Piece | Where | What |
|-------|-------|------|
| Frontend (React/Vite) | Vercel | Static build + rewrites to backend |
| Backend (Spring Boot) + IPFS + Anvil | AWS EC2 | Docker Compose |
| PostgreSQL | Neon | Serverless Postgres, Flyway migrates on boot |

## 1. Neon (Postgres)

1. Create a project at [neon.tech](https://neon.tech) (region: closest to your EC2, e.g. `us-east-1`).
2. Create the database (`certichain`) in the SQL editor if it doesn't exist.
3. Copy the **JDBC** connection string from Settings > Connection Details, using the **Direct** connection — **not** the `-pooler` host. PgBouncer's transaction mode breaks Flyway's session-level advisory locks.
   ```
   jdbc:postgresql://ep-XXXX.region.aws.neon.tech/certichain?sslmode=require
   ```
   Drop the `channel_binding` param — that's libpq-only, `sslmode=require` already gives TLS.

## 2. AWS EC2 (backend + IPFS + Anvil)

1. Launch **Ubuntu 24.04**, `t3.small` (2 GB) minimum, `t3.medium` recommended.
2. Security group:
   - `22` (SSH) — your IP only
   - `6969` (backend API) — `0.0.0.0/0` (Vercel's rewrites need to reach it)
3. Allocate an **Elastic IP** and attach it — the URL must never change or Vercel rewrites break.
4. Copy **both** `deploy/` and `certchain/` (the compose build context is `../certchain`), then configure:
   ```bash
   # from the repo root on your laptop
   rsync -av --exclude target --exclude .idea -e "ssh -i KEY.pem" \
     deploy/ ubuntu@<EC2_IP>:~/deploy/
   rsync -av --exclude target --exclude .idea -e "ssh -i KEY.pem" \
     certchain/ ubuntu@<EC2_IP>:~/certchain/

   ssh -i KEY.pem ubuntu@<EC2_IP>
   cd deploy
   cp env.production.example .env
   nano .env   # fill in Neon URL/creds + secrets
   ./ec2-setup.sh
   ```
5. Verify:
   ```bash
   sudo docker compose -f docker-compose.prod.yml ps
   sudo docker compose -f docker-compose.prod.yml logs -f backend   # watch Flyway apply migrations
   curl http://localhost:6969/v3/api-docs | head
   ```

> The compose file is named `docker-compose.prod.yml`, which Compose does **not** auto-discover — always pass `-f docker-compose.prod.yml`.

### `.env` template

```bash
# --- Neon Postgres ---
CERT_DB_URL=jdbc:postgresql://ep-XXXX.region.aws.neon.tech/certichain?sslmode=require
CERT_DB_USERNAME=certichain
CERT_DB_PASSWORD=CHANGE_ME

# --- Secrets (generate: openssl rand -hex 32) ---
SSDCVE_JWT_SECRET=CHANGE_ME_64_HEX_CHARS
SSDCVE_KEYSTORE_PASSWORD=CHANGE_ME

# --- Internal services (do not change) ---
SSDCVE_IPFS_API_URL=http://ipfs:5001
SSDCVE_BLOCKCHAIN_RPC_URL=http://anvil:8545
SSDCVE_BLOCKCHAIN_FROM=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
SSDCVE_BLOCKCHAIN_CHAIN_ID=31337

# --- HTTPS (Vercel is HTTPS, so cookies must be Secure) ---
CERTICHAIN_AUTH_COOKIE_SECURE=true
```

Notes:
- The backend **auto-creates its keystore** on first boot; it persists in the `certichain_keystore` volume. Never delete that volume or all signing keys are lost.
- Anvil persists chain state in `certichain_anvil_data` (saved on shutdown, loaded on start). Deleting it resets the chain and invalidates all credential anchors.
- IPFS and Anvil are **not exposed** to the internet — only the backend reaches them over the internal compose network.

## 3. Vercel (frontend)

1. Import the repo in Vercel and set **Root Directory** to `frontend` — the Vite app lives there; the repo root has no `package.json`. Vercel reads `vercel.json` from the Root Directory, so it is `frontend/vercel.json`.
2. Edit `frontend/vercel.json` — replace `YOUR_EC2_IP` with the Elastic IP:
   ```json
   {
     "rewrites": [
       { "source": "/api/:path*", "destination": "http://YOUR_EC2_IP:6969/api/:path*" },
       { "source": "/swagger-ui/:path*", "destination": "http://YOUR_EC2_IP:6969/swagger-ui/:path*" },
       { "source": "/v3/api-docs/:path*", "destination": "http://YOUR_EC2_IP:6969/v3/api-docs/:path*" }
     ]
   }
   ```
3. Framework preset auto-detects **Vite** (build `npm run build`, output `dist`). Deploy.
4. The rewrites are server-side, so the browser only talks to Vercel — cookies and auth work with no CORS setup.

## Rollback

- **Backend**: `git checkout <prev-commit>` on the instance, `sudo docker compose -f docker-compose.prod.yml up -d --build` (image is built from local source).
- **Frontend**: Vercel → Deployments → previous deployment → Promote.
- **DB**: Flyway migrations are forward-only; restore from a Neon branch/backup if needed.

## Upgrade path (later, if needed)

- HTTPS between Vercel and EC2: put a domain + TLS (Caddy/nginx) in front of the backend instead of the raw IP.
- Anvil is a dev chain — swap to a real network (Sepolia) by changing `SSDCVE_BLOCKCHAIN_RPC_URL`/`FROM`/`CHAIN_ID` and redeploying the contract.