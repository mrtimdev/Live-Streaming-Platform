# Live Streaming Platform

A self-hosted Live Streaming Platform built with **Spring Boot**, **React + Vite**, **MediaMTX**, **MySQL 8**, **Redis 7**, and **Docker Compose**. Administrators broadcast live video from **OBS Studio** over **RTMP**, MediaMTX ingests and distributes the stream via **HLS**, and public viewers watch in any modern web browser with real-time viewer tracking.

---

## Architecture

- **MediaMTX (`mediamtx:1.11.3`)**: Handles all RTMP ingestion (`:1935`) and HLS distribution (`:8888`). Control API (`:9997`) is private to the internal Docker network.
- **Spring Boot 3 (`backend`)**: Manages authentication (JWT + BCrypt), stream metadata, one-time stream key generation/hashing, MediaMTX HTTP publishing auth, scheduled stream status monitoring, Redis-backed viewer heartbeats, and analytics. Never proxies video packets.
- **React + Vite + Tailwind CSS (`frontend`)**: Public live homepage, HLS.js watch page, and protected Admin Dashboard (streams, OBS credentials, analytics, users).
- **MySQL 8 (`mysql`)**: Persistent storage for users, streams, viewer sessions, and broadcast history (managed with Flyway migrations).
- **Redis 7 (`redis`)**: Real-time stream status cache, active viewer session tracking (45s TTL via 15s heartbeats), and refresh token revocation.

---

## Quick Start (Docker Compose)

1. **Configure environment variables before the first launch (optional for local development):**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and replace `CHANGE_ME_*` values with strong secrets. For a local run, you can skip this step and use the Compose defaults. With an existing MySQL volume, database and admin bootstrap settings do not change credentials already stored in the database.

2. **Start the entire stack:**
   ```bash
   docker compose up -d --build
   ```
   Or use the helper script:
   ```bash
   ./scripts/start.sh
   ```

3. **Access the platform:**
   - **Public Website & Admin UI:** `http://localhost:3000`
   - **Backend Health:** `http://localhost:8080/api/health`
   - **RTMP Ingestion:** `rtmp://localhost:1935/live`
   - **HLS Playback:** `http://localhost:8888/live`

4. **Default Admin Login** (configured via `.env`):
   - Username: `admin` (or `APP_ADMIN_USERNAME`)
   - Password: `APP_ADMIN_PASSWORD` (defaults to `admin123` if unset)

---

## Go live from your MacBook camera

1. Stop any publisher using the broadcast's main feed.
2. Open **Admin → Streams**, choose a broadcast, and click **Preview camera** under **Broadcast from this browser**.
3. Allow camera access in Chrome and macOS if prompted. Check the preview, then click **Go live**.
4. Open **Watch Page** to verify playback. Keep the broadcasting tab open and click **Stop broadcast** when finished. This mode publishes video only.

The camera publishes to the existing main feed. Select **OBS program** in **Camera feeds** if the director's view is currently set to another live camera. Browser publishing uses H.264 over WebRTC. Use Chrome on `localhost` for local testing.

For browser publishing from outside the server, serve the admin page over HTTPS. Set `MEDIAMTX_WEBRTC_HOST` to the server's reachable public hostname or IP and `MEDIAMTX_WEBRTC_BIND_IP=0.0.0.0`. Allow UDP port `8189` through the host firewall and forward it to the server if it is behind NAT. The WebRTC HTTP listener stays on the Docker network.

## Share a temporary public watch link from this Mac

The website and video use the same address. Keep `MEDIAMTX_HLS_PUBLIC_URL=/hls/live` in `.env`; do not use `localhost` or a private IP for an internet viewer's video URL.

Start the optional viewer-only HTTPS tunnel:

```bash
docker compose -f docker-compose.yml -f docker-compose.public.yml up -d --build backend frontend public-viewer public-tunnel
docker compose -f docker-compose.yml -f docker-compose.public.yml logs public-tunnel
```

Find the `https://...trycloudflare.com` URL in the logs. Append `/watch/<streamId>` and share that URL. Viewers need no account. The public watch page also has **Copy watch link**. The admin page's copy button uses its current website address, so copying from localhost produces a local-only link.

Keep publishing your MacBook camera from `http://localhost:3000/admin/streams/<streamId>`. The tunnel carries viewer traffic, not the camera's WebRTC UDP connection. Admin, login, publishing, and internal API routes are blocked at the public tunnel entry point. The public homepage lists live broadcasts; all published camera feeds are public.

Stop public access without stopping the local app:

```bash
docker compose -f docker-compose.yml -f docker-compose.public.yml stop public-tunnel public-viewer
```

Keep the Mac awake, Docker running, and the broadcaster tab open. The link changes when a new tunnel is created. Cloudflare Quick Tunnels are for testing, have no uptime guarantee, and allow at most 200 concurrent in-flight requests (not 200 viewers). For a permanent audience, use an always-on host and a stable domain with delivery capacity sized for the audience. See [Cloudflare Quick Tunnel limits](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

## OBS Studio Setup

1. Log in to the Admin Console at `http://localhost:3000/login`.
2. Navigate to **Create Stream**, enter a title, and submit.
3. Copy the generated **OBS Server URL** (`rtmp://<your-host>:1935/live`) and **OBS Stream Key** (`<streamId>?user=publisher&pass=<secret>`).
   > **Note:** The publishing secret is shown only once. If lost, click **Regenerate Key** on the stream details page.
4. In OBS Studio, open **Settings → Stream**:
   - Service: **Custom...**
   - Server: paste the **OBS Server URL**
   - Stream Key: paste the **OBS Stream Key**
5. Click **OK** and **Start Streaming**.
6. Within ~3 seconds, the backend monitor detects the active publisher from MediaMTX, marks the stream **LIVE**, records a `STARTED` history event, and lists the stream on the public homepage.

### Multiple cameras

1. In **Stream Details → Camera feeds**, add a name for each individually selectable camera. Save each camera's publishing key when it is displayed.
2. Use each camera's server URL and key in its RTMP-capable camera or encoder. For a USB or network camera without RTMP publishing, use an encoder to send its feed. Each camera needs its own concurrent RTMP output.
3. To switch or mix cameras inside OBS, send its main output using the original stream key and select **OBS program** in Camera feeds. To switch between individual live feeds from the dashboard, select **Use for director’s view** beside a camera.
4. Share the broadcast's **Watch Page** URL. Viewers start with **Director’s view** and can select any camera. If a selected feed goes offline, the player uses the director’s view until that feed returns. If the director’s chosen camera is offline, the director’s view uses the OBS program when live, then an available camera.

The broadcast stays live while the OBS program or any registered camera is publishing. Camera changes use the same watch page and viewer session. The player streams one view at a time.

---

## REST API Reference

Base path: `/api`

### Authentication
- `POST /api/auth/login` — Admin/user login (returns JWT access + refresh tokens)
- `POST /api/auth/refresh` — Refresh access token
- `POST /api/auth/logout` — Revoke refresh token

### Stream Management (Admin only)
- `POST /api/streams` — Create stream & generate one-time OBS credentials
- `GET /api/streams` — List streams (supports `search`, `status`, `page`, `size`, `sortBy`, `sortDir`)
- `GET /api/streams/{id}` — Get stream details
- `PUT /api/streams/{id}` — Update stream metadata
- `DELETE /api/streams/{id}` — Delete stream
- `POST /api/streams/{id}/regenerate-key` — Regenerate publishing secret
- `GET /api/streams/{id}/history` — Get stream start/stop history

### Public Streaming
- `GET /api/public/streams` — List currently `LIVE` streams
- `GET /api/public/streams/{id}` — Public stream details
- `GET /api/public/streams/{id}/playback` — Playback URL & status
- `POST /api/public/streams/{id}/heartbeat` — Record/refresh viewer session
- `DELETE /api/public/streams/{id}/heartbeat` — Remove viewer session on leave

### Analytics & Users (Admin only)
- `GET /api/analytics/dashboard` — Aggregate dashboard metrics
- `GET /api/analytics/streams` — Per-stream analytics summary
- `GET /api/analytics/streams/{id}` — Detailed stream analytics & history
- `GET /api/users`, `POST /api/users`, `PUT /api/users/{id}`, `DELETE /api/users/{id}` — User management

### Internal MediaMTX (Private Docker Network Only)
- `POST /api/internal/mediamtx/auth` — Validates RTMP publishing keys & permits public HLS reads
- `GET /api/internal/mediamtx/health` — Checks MediaMTX control API connectivity

---

## Production Deployment

1. Point your domain (e.g. `stream.example.com`) to your Linux VPS.
2. Open firewall ports: `80/tcp`, `443/tcp`, and `1935/tcp` (RTMP). **Do not** expose `3306`, `6379`, or `9997`.
3. Provision TLS certificates (e.g. Certbot / Let's Encrypt) and configure `nginx/nginx.conf`.
4. Update `.env` with the public website URL, RTMP ingestion URL, and HTTPS HLS URL. For the included Nginx configuration, use `APP_PUBLIC_URL=https://stream.example.com`, `MEDIAMTX_RTMP_PUBLIC_URL=rtmp://stream.example.com/live`, and `MEDIAMTX_HLS_PUBLIC_URL=/hls/live`. Configure strong JWT, database, and admin credentials before exposing a new installation.
5. Schedule `./scripts/backup.sh` via cron for automated MySQL backups.

---

## Running Automated Tests

**Backend (Maven):**
```bash
cd backend && mvn test
```

**Frontend (Vite build check):**
```bash
cd frontend && npm install && npm run build
```
