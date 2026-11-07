# Local voice integration status

This source revision adds an OpenAI Realtime GA WebRTC adapter and a same-origin Node server. It is separate from the earlier hosted silent version; publishing this source does not deploy it or release a container image.

The browser never receives or stores the standard API key. It requests a server-approved session, sends microphone audio over the official WebRTC connection, and plays remote model audio. There is no local TTS, prerecorded voice, or fallback synthesis. The model can lead the current lesson and request UI phase changes. Its completion tool does not persist a completed lesson: a human must confirm completion.

Default mode is disabled. Only an explicitly configured adult test using fictitious situations is allowed. This release does not unlock child use. A checkbox or environment variable is not evidence of approved ZDR, consent, age-appropriate evaluation or other compliance requirements.

Stop, pause, changing lesson, resetting, page exit or backgrounding end the connection and release microphone tracks. Each browser session has a five-minute timer. This is a convenience limit, not a guaranteed financial budget control. The service limits new session attempts; use separate provider-side project budgets and account controls.

## What is and is not tested

Automated tests inject fake networking, peer connections and microphones. No real API key, paid call, recording or child data has been used. Frontend build and existing content tests are required in addition to these tests. Mock tests do not prove model availability, actual WebRTC negotiation, audio playback, interruption quality, lesson quality or account eligibility.

Dockerfile.voice and compose.voice.yaml now package the local Node route; this container recipe is not built or published. The older static Docker/Nginx package and private Sites deployment remain separate. Do not expect those static hosting paths to gain voice just by copying an API key. The current local server is loopback-only; remote-phone/LAN use needs a separately secured HTTPS deployment and access control, not a simple port-forward.

See API-LOCAL.md for current official documentation, environment settings and local running steps. Never put a key into VITE_* variables, frontend code, Git or chat.

## Verification record (2026-11-06)

- Production build passed; 7 curriculum, 4 static-hosting, 17 browser-adapter mock and 17 server mock tests passed (45 total).
- A real local Node HTTP server returned 200 for the built homepage and `/api/voice/status`, with ready=false and childUseAllowed=false. The exact runtime file subset was separately copied to a temporary directory and started successfully without node_modules.
- Independent review caught and fixed missing runtime/build files in the container recipe, stale event handling, connecting-choice handling, unconfirmed restart cleanup, duplicate tool events and interrupted response scheduling.
- Docker build/run/pull is NOT verified: no Docker executable, daemon or socket is available. No image was published. The separate cloud browser could not reach the local service in the attempted check (ERR_CONNECTION_REFUSED); current local revision has no successful native-browser visual/real microphone acceptance. Prior published-page testing does not prove this new integration.
- No real credentials, OpenAI sessions, recordings, child data or paid calls were used. See CONTAINER-RELEASE.md for the release blockers.

Follow-up offline verification: six additional adapter cases passed, covering insecure contexts, autoplay rejection, ICE failure, timeout with late microphone permission, malformed/unknown tools, and all 30 lessons' session/choice wiring. Current total is 51 tests (7 curriculum + 4 hosting + 23 adapter + 17 server). Independent final review found no further blocking issue after the fixes. Real provider behavior and a container build remain unverified.
