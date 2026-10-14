## Deployment configuration follow-up — 2026-10-14

The owner selected preservation of login and task synchronization. The candidate
adds a deployment-only static builder and per-project policy invocation. Public
source defaults remain disabled; operator identity origin/site key are supplied
through the existing Pages environment and appear only in the hashed artifact.
No shared guard implementation, identity provider contract or task storage changes.
Ten local regression/build tests pass. Source publication, provider pin/config
readback and rendered acceptance are recorded separately; local tests alone do
not claim production rollout. See [identity integration](IDENTITY_INTEGRATION.md).

# Local optional identity candidate — 2026-10-14

The [integration guide](IDENTITY_INTEGRATION.md) describes the default-off bridge,
explicit provider configuration, mocked regression tests and migration for
existing operators. No production setting or publication changed. Preserve the
existing governed publishing channel and obtain release approval before any
push that could publish. Private audit evidence is outside this public repository.


## Governed automatic release — 2026-09-20

Publication stays automatic on the registered production branch after the provider build gate is activated. Its exact source, live ancestry, capability paths, artifact and bootstrap evidence are bound in `.release/policies.json`; the provider pins `.release/guard.mjs` and this policy by SHA-256. Runtime identity is read from `/__release.json` after activation. The first build must preserve existing live asset fingerprints; no application data or identity flow changes are part of this control installation. Do not publish from an older or dirty checkout or run a second direct lane. Manual publication must preserve the provenance watermark and source lineage. Historical deployment IDs below remain dated evidence; latest live metadata is not accepted merely by copying it. Operational rollback of the gate restores only the recorded previous build/source settings after source validation, never a blanket old-source deploy. Workspace evidence: `/Users/ylsuen/CF/reports/operations/release-governance-auto-20260920/`.


## Publishing authority verified 2026-09-20

- Pages `todo-list`: verified production `db4855f2-da94-407f-b501-11ba5a8bf2b5`, source `69b12ac9d12a942e5739636259599bd4673b199b`, 28 artifact entries; policy `.release/policies.json`. Automatic production remains enabled through the provider-pinned guard.

These are dated release receipts, not permission to replay an old source. Current publication must use the registered exact repository/branch/target, preserve accepted production ancestry and capabilities, verify the built artifact and live baseline, then read back the actual result. A clean checkout, newer timestamp or default branch alone is insufficient. Existing project-specific acceptance gates remain binding. No second production publisher is allowed. Current source/control operations and rollback evidence: `/Users/ylsuen/CF/reports/operations/release-governance-auto-20260920/REPORT.md`; fleet routing: `/Users/ylsuen/CF/platform/release-authority.json`. Retired workflow definitions are recovery evidence only.
