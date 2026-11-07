# Revision note

The hosted V1 status below describes the last published version. The current source revision adds a disabled-by-default, adult-only Realtime GA integration. See LOCAL-VOICE-STATUS.md and API-LOCAL.md. No real API call has been tested.

# V1 course build

This is an adult-only, silent evaluation build, not a finished child-facing voice tutor.

Implemented: 30 original structured activities, ten per subject; theme routes; six-stage lesson flow; retry feedback; mathematical counters and pictorial English choices; local completed-course IDs; parent safety/source information; next-pack preparation hint after seven completions per subject; private hosting and Docker deployment configuration.

Not implemented: official API transport, live voice, microphone access, model-led adaptive dialogue, child-data authorization, approved ZDR verification, authentication for LAN hosting, cross-device progress, automatic course generation. No API calls or local/pre-recorded speech are present. Connecting a key alone will not activate teaching.

Science illustrations are decorative and not physics simulations. Physical activities require adult supervision. English is a script and visual preview of future API-led teaching, not a listening or pronunciation assessment. Course-completion markers indicate navigation completion, not learning mastery.

Eight science companions are available. Narrow viewport checks use actual 390×780 and 650×390 embedded browser viewports; these are responsive layout tests, not physical-device or device-emulation tests. Docker configuration is supplied but cannot run in this cloud environment because Docker, Podman, containerd and the Docker socket are absent.
