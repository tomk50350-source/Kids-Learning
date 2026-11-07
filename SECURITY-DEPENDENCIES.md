# Dependency remediation, 2026-11-07

This is a dependency-advisory check and targeted update, not a security audit or a claim that the application/container is secure.

## Findings and reachability

The first GitHub Actions build reported six affected packages (five high, one moderate). A subsequent local npm registry audit of the previous lockfile returned 13 affected packages (12 high, one moderate), including transitive propagation through Babel. These are observations from different runs; the first log did not contain the full advisory JSON, so the counts must not be treated as an identical advisory snapshot.

Concrete advisory-bearing packages in the later report:

- Vite: development-server/editor paths, including Windows editor argument/UNC handling and file access boundaries. Examples: GHSA-587h-7wmj-h5pm, GHSA-rq7h-c2jc-7f22.
- PostCSS: sourceMappingURL traversal and map-file disclosure while parsing attacker-controlled stylesheets/maps. GHSA-r28c-9q8g-f849 and GHSA-fxqj-rqcc-2cmp.
- nanoid: non-secure/custom generator loops for invalid sizes. GHSA-28wg-ghj8-5hjv and GHSA-2v37-7h3g-55p8.
- source-map-js: denial of service through invalid indexed source-map offsets. GHSA-68fv-2mgg-jv7q.
- Browserslist: memory growth and untrusted custom-stats handling. GHSA-c83g-rgw3-j3cx and GHSA-73wf-gq98-2v4g.
- baseline-browser-mapping: process termination on invalid input. GHSA-w5vr-8v7q-w6rv.

Advisories are available at https://github.com/advisories/<ID>.

These packages belong to the build/development dependency chain. The production image copies only built browser assets, the Node server, curriculum and engine; it does not copy application node_modules, Vite, Babel or PostCSS. The backend imports only Node built-ins and checked-in source. The application does not expose a Vite dev server or accept user CSS/source maps for compilation in production. That reduces direct reachability of these findings in the intended production runtime, but does not excuse vulnerable build tooling or prove absence of other runtime issues. The Node base image/OS/global npm are NOT covered by an application npm audit.

## Applied changes

- Vite 6.4.2 → 6.4.5, staying within the same major line.
- Compatible transitive lockfile refresh, without `npm audit fix --force`, including PostCSS 8.5.16 → 8.5.32, nanoid 3.3.15 → 3.3.20, source-map-js 1.2.1 → 1.2.2, Browserslist 4.28.5 → 4.29.5 and baseline-browser-mapping 2.10.42 → 2.11.35. Babel and Rollup compatible updates are recorded in package-lock.json.
- Vite and the React Vite plugin moved to devDependencies to accurately describe their use. The audit below still includes development dependencies; findings were not hidden with `--omit=dev`.
- CI now explicitly runs npm audit with moderate-or-higher findings failing the job.
- Official checkout/setup-node actions updated from v4 to v7 (Node24 action runtime), with credential persistence and package cache disabled. This is separate from the application Node22 runtime.
- Container smoke test verifies a non-root process and absence of /app/node_modules, in addition to homepage, disabled API and no-key status.

## Verification and limits

Local clean npm ci, production build and all 51 tests passed. Full `npm audit --json` after the update returned zero known reported vulnerabilities at this check. This result is time-dependent and does not cover unknown vulnerabilities, OS/base-image packages, application logic or adversarial prompt behavior.

The prior commit passed a real GitHub Actions linux/amd64 image build and no-key container smoke test: https://github.com/tomk50350-source/Kids-Learning/actions/runs/42327372389 . The updated lockfile and workflow require a new CI run; do not carry that previous success forward as proof of the new image.

No registry image has been published, and no real API key/audio, paid OpenAI request or child data was used. Child eligibility/ZDR and real voice end-to-end verification remain separate unresolved release requirements.
