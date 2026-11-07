# Container delivery status

The container recipe exists, but NO registry image has been built, published or pulled in this cloud environment. Do not describe this as completed V1.0 or a verified child-facing product.

## Local adult-only build

Requires Docker with Compose, internet access for official Node image/npm packages, and an adult operator. Copy `.env.example` to `.env`; fill the server-side `OPENAI_API_KEY` locally. Set `OPENAI_REALTIME_ENABLED=true` and `ADULT_TEST_MODE=true` only when you approve a billable adult fictitious-data test. Keep all actual children, names and personal details out of that test.

Run `docker compose -f compose.voice.yaml up --build -d`, then open `http://localhost:8787`. No microphone opens until the adult confirms in the interface. Stop with `docker compose -f compose.voice.yaml down`.

This is localhost only, not a LAN deployment. Do not change to `0.0.0.0:8787:8787`, expose it on a router, share its container network with untrusted workloads, or put it behind a public proxy. LAN use needs authenticated HTTPS and a separate security review. The image has no API key, environment file or audio recording. Docker administrators can inspect runtime environment secrets; use a trusted machine.

The existing `Dockerfile`/`compose.yaml` remain the earlier silent static deployment. `Dockerfile.voice`/`compose.voice.yaml` are the new server-backed adult-test path. The model is OpenAI Realtime GA, not GPT-Live-1. See `API-LOCAL.md`.

## Before “pull image, fill key, use” is true

1. Confirm a source repository and image registry (for example GHCR), owner, image name and private/public visibility. Publishing code and generated assets needs the user's approval. Do not invent a registry URL.
2. Use an authorized Docker/BuildKit runner and registry credentials to build, test, tag and push the image. Publish immutable digest and CPU architecture support; verify a fresh pull on the target architecture. No deployment credentials or API key belong in the image/build context.
3. Replace the `build` block and local image tag in a release copy of Compose with the verified registry digest. Private registries additionally require the user's authorized registry login.
4. Verify a real, explicitly approved billable adult session with the intended account/model: microphone permission, SDP handshake, remote audio, child-safe lesson constraints, interruption, phase tools, disconnect cleanup and spending controls. Offline mocks do not establish actual API compatibility or model access.
5. Child use remains disabled. Before any under-13 personal data reaches OpenAI, verify approved Zero Data Retention eligibility/configuration and applicable consent/safety requirements. A key, `store:false`, parental checkbox or environment flag alone is not sufficient. This implementation has no child-enable switch.

## Current environment blocker

On this cloud worker, `docker` and `dockerd` are absent, `/var/run/docker.sock` is absent, and the task user has UID 1000. The managed Docker health command therefore cannot run. The runtime environment-status tool is not exposed in this tool catalog. No Docker build/run/push has been claimed, and no system installation/network change has been attempted.

## Repeatable offline image smoke check

`scripts/verify-container.sh` builds the local image, starts a disposable non-root/read-only container with an explicitly empty key and both API switches off, checks the homepage/status and confirms the session API returns 503, then removes only its own container. It does not publish, log in to a registry, record audio or call OpenAI. Run it from the project root on an authorized Docker host. Script syntax was checked here; execution stops with `Docker unavailable: no build/run performed.` and exit 2 in this environment.

No Docker, BuildKit/buildctl, Podman, nerdctl, Kaniko or Buildah executable was available for the verification recorded here. A separately authorized Actions runner is a future option; no workflow run or registry upload has been initiated.
