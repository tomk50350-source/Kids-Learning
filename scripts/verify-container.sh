#!/bin/sh
# Run locally after an authorized Docker build environment is available.
# No registry upload, API key, microphone, or OpenAI call is used.
set -eu
command -v docker >/dev/null || { echo 'Docker unavailable: no build/run performed.' >&2; exit 2; }
image=discovery-learning:smoke
name="discovery-learning-smoke-$$"
cleanup() { docker rm -f "$name" >/dev/null 2>&1 || true; }
trap cleanup EXIT INT TERM
# Optional managed cloud CA. Never disable TLS verification.
if [ -n "${CODEX_PROXY_CERT:-}" ]; then
 docker build --secret "id=proxy_ca,src=$CODEX_PROXY_CERT" -f Dockerfile.voice -t "$image" .
else
 docker build -f Dockerfile.voice -t "$image" .
fi
docker run -d --name "$name" --read-only --tmpfs /tmp:size=16m --cap-drop ALL --security-opt no-new-privileges:true -e OPENAI_API_KEY= -e OPENAI_REALTIME_ENABLED=false -e ADULT_TEST_MODE=false "$image" >/dev/null
for i in 1 2 3 4 5 6 7 8 9 10; do
 if docker exec "$name" node -e "fetch('http://127.0.0.1:8787/api/voice/status').then(async r=>{const s=await r.json();if(!r.ok||s.ready||s.configured||s.childUseAllowed)process.exit(1)}).catch(()=>process.exit(1))"; then break; fi
 sleep 1
done
docker exec "$name" node --input-type=module -e "const root=await fetch('http://127.0.0.1:8787/');if(!root.ok||!(await root.text()).includes('<div id=\"root\"></div>'))throw Error('homepage');const s=await (await fetch('http://127.0.0.1:8787/api/voice/status')).json();if(s.ready||s.configured||s.childUseAllowed)throw Error('unsafe default');const p=await fetch('http://127.0.0.1:8787/api/voice/session',{method:'POST',headers:{Origin:'http://127.0.0.1:8787','Content-Type':'application/json'},body:'{}'});if(p.status!==503)throw Error('expected disabled API');console.log('Container offline smoke checks passed');"
echo 'Image built locally only; not published. This does not test real voice or child eligibility.'
