What this repo does: It accepts live camera or OBS video, manages broadcasts in Spring Boot, and delivers video through MediaMTX to browser viewers. This audit follows public sharing from the watch page through the API and video proxy. Assumed load: a small temporary test audience watching a Mac-hosted broadcast, not a large production event.

## Must fix

1. **Viewer video URLs pointed to the viewer's own computer — resolved** (`docker-compose.yml:85`, `backend/src/main/resources/application.yml:53`)
   - **What this is:** The API supplies the video playlist address for the main feed and additional cameras.
   - **Problem:** `http://localhost:8888/live/...` points to each viewer's own machine. A public website therefore loads but its video fails.
   - **Fix:** Changed the active `.env`, default configuration, example, and test configuration to `/hls/live`. The existing website proxy carries playlists and video segments through the same website address, including HTTPS. Added anonymous API regression assertions.
   - **If we skip it:** Sharing a reachable website still produces broken video for remote viewers.

2. **No public internet entry point — resolved for testing** (`docker-compose.public.yml:2`, `nginx/public-viewer.conf:1`)
   - **What this is:** Docker originally exposed the site on the Mac's network, with no internet hostname.
   - **Problem:** A localhost or private network address cannot be used by someone on another network. Forwarding the entire frontend would also publish its login and admin API routes.
   - **Fix:** Added an optional temporary Cloudflare tunnel and a viewer-only proxy. It allows watch pages, frontend assets, public APIs, and HLS video while blocking admin, login, publishing, and internal routes. It passes the HTTPS origin and Cloudflare client IP to Spring Boot without trusting visitor-provided forwarding headers.
   - **If we skip it:** Remote viewers cannot reach the Mac, or a broad tunnel exposes more application routes than viewing requires.

## Should fix before a larger audience

3. **Many viewers on one network can lose accurate viewer counts** (`backend/src/main/java/com/company/livestream/security/RateLimitFilter.java:25`, `frontend/src/hooks/useViewerHeartbeat.js:28`)
   - **What this is:** Each viewer sends a presence update every 15 seconds. The server allows 120 updates per minute per public IP address.
   - **Problem:** More than 30 viewers sharing a school, office, or carrier address generate over 120 periodic updates per minute, even before initial joins. Some updates receive HTTP 429; sessions can expire and counts become inaccurate. Video delivery is separate and continues.
   - **Fix:** Before scaling, size the aggregate IP limit for the intended audience and combine it with a per-session limit and bounded/shared counters. Keep abuse protection; do not simply disable it. This was not changed for the small test audience.
   - **If we skip it:** Viewer counts can under-report a crowd behind one shared address.

4. **The temporary link depends on the Mac and tunnel staying up** (`docker-compose.public.yml:14`)
   - **What this is:** The public URL routes through a running Docker tunnel to this Mac.
   - **Problem:** Sleeping the Mac, stopping Docker, or losing internet interrupts playback. A newly created quick tunnel gets a different address. Quick Tunnels are limited to 200 simultaneous in-flight requests, not 200 viewers, and have no uptime guarantee.
   - **Fix:** Keep the Mac awake for this test. Move permanent broadcasts to an always-on host with a stable hostname and measured video delivery capacity. See https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/.
   - **If we skip it:** A link suitable for a demonstration is mistaken for a reliable large-audience service.

## Verification

- All five backend tests passed, including new same-origin anonymous playback URL assertions.
- Backend and frontend Docker production builds passed. The host Node executable failed because its Homebrew simdjson library is missing; Docker supplied a working Node runtime.
- The public HTTPS watch page and anonymous stream metadata returned HTTP 200.
- Public admin page, login, admin API, auth API, and internal MediaMTX API returned HTTP 403.
- Created a temporary test-pattern broadcast, verified LIVE metadata and a browser-origin heartbeat, then decoded three seconds of HLS video through the internet-facing HTTPS URL using FFmpeg. Stopped and removed the test broadcast afterward.
- Opened Streaming one's public page in Chrome and verified Copy watch link displayed Copied.
- Streaming one was OFFLINE at the final check. No user camera was activated during this audit.

Verdict: Public sharing works for the requested temporary test. Start the camera locally and share the public watch URL; address the audience and uptime limits before production.

Not checked: Large-audience load, mobile-carrier playback on a separate physical device, a new MacBook camera session, permanent DNS/TLS deployment, or a full audit of unrelated user management and analytics code.
