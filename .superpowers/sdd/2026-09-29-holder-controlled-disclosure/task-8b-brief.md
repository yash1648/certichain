# Task 8, Round B Brief: the four browser drives

**Source of truth:** `docs/superpowers/plans/2026-09-29-holder-controlled-disclosure.md`, Task 8,
Steps 4–9.
**Base commit:** `63d6cff`.

## What has already been done for you

- Backend is **up and serving** on `http://localhost:6969` (pid 95539, started with `setsid`).
  Schema is at **version 11** — the log reads `Current version of schema "public": 11` and
  `Schema "public" is up to date. No migration necessary.` The new schema and endpoints are live.
- Frontend dev server is **up** on `http://localhost:5173`, started with
  `VITE_RETICLE_CAPTURE_BODIES=1` so request bodies are capturable.
- PostgreSQL, IPFS and Anvil containers are all up.
- Reticle daemon is **running on :4400 with 1 page connected** to `http://localhost:5173`.

**Do not start, stop, or restart any of these.** If Reticle reports the daemon is gone, that is a
finding to report, not something to fix by re-launching things — the daemon is designed to exit when
idle and is restarted by a Reticle tool call. If you do need a page, use `reticle_lease`
(`action: "acquire"`) or the `reticle open` CLI, not a manual daemon.

**Run commands from `/home/grim/Projects/CertiChain/frontend`.** The daemon is scoped to that
directory; the earlier failure mode was a daemon started from elsewhere reporting "no page
connected" and unable to attribute the app.

## The honesty rule — this is the most important thing in the brief

This is the only executed evidence in the entire 9-task plan. Tasks 5, 6 and 7 were all approved
on *traced-from-source* reasoning and all three report "nothing was executed". A drive that ends
without `reticle_act_and_wait` or `reticle_assert` producing a verdict **has no result**, however
many tools you used.

- `verified: "unknown"` is **not a pass.** It means Reticle could not tell what happened.
- `verified: "no-fault"` is **not a pass.** Nothing was declared to prove.
- Never weaken a check to make it pass. If a check cannot be satisfied, report the failure.
- If you cannot reach the Reticle tools at all, report **BLOCKED** with what you tried. That is a
  legitimate and useful outcome. A fabricated pass is not.

Prefer `reticle_act_and_wait` with `until` set on the specific request, and
`refuseWhenThrottled: true` on a tab this harness opened rather than the CLI — throttling would
otherwise turn a silent no-op into a false pass.

## Accounts

| Persona | Email | Password |
|---|---|---|
| Issuer | `registrar@mit.edu` | `DemoIssuer123!` |
| Holder | `alex.mercer@alumni.org` | `DemoHolder123!` |
| Probe holder | `probe.holder@certichain.test` | `ProbeHolder123!` |

Login is rate-limited to 10 attempts per 15 minutes. Budget your attempts; a burst of wrong
passwords will lock the persona out for the rest of the run.

## The four drives

### Drive 1 — issuer side (Task 8 Step 5)

Log in as the issuer. Issue a credential to `alex.mercer@alumni.org` with the preset claims plus at
least one **custom, non-preset** key — use `researchTopic`. This is the Task 5 work: arbitrary
claim rows the backend never saw before.

Verdicts required:
- Issuing a credential with custom non-preset claim keys returns **`POST /api/issuer/credentials`
  → 201**.
- A second attempt that types a **duplicate** key shows the duplicate-key error **and does not fire
  a request** — the submit button is blocked client-side. Assert the absence of the request, not
  merely the presence of the error.

### Drive 2 — holder side (Task 8 Step 6)

Log in as the holder, open the credential from Drive 1, open **"What do verifiers see?"**, and hide
one claim that is **not** the recipient name, so the change is unmistakable.

Verdicts required:
- Toggling the claim fires **`PUT /api/holder/credentials/{id}/disclosure` → 200**.
- The panel's summary text updates to the new shared count.
- The preview omits **exactly** the hidden claim — and only that one.

### Drive 3 — verifier side (Task 8 Step 7)

Download the credential, then verify it as an **unauthenticated** verifier through the app's
verification view.

Verdicts required:
- The **partial-disclosure notice appears** with the correct `disclosed` / `total` counts. This is
  the Task 7 work, whose whole purpose is the notice not vanishing.
- The result is still **valid** and the anchor still verifies. A partial view must not read as a
  broken credential.
- The hidden claim is **absent** from the claims the verifier can see.

### Drive 4 — the untouched path (Task 8 Step 8)

Verify a credential that has **no disclosure policy** — any of the 8 pre-existing ones.

Verdicts required:
- It verifies with **no** partially-disclosed notice.
- Its full claim set is intact.

**This is the check that would catch a mistake in Global Constraint 3.** If it fails, already-anchored
credentials have started behaving differently and the feature is unsafe to ship. Treat it as the
highest-value drive in the set.

## The state-transitions the reading could not check

Drives 1 and 2 exist to exercise work that has **never been executed**, and both had state-machine
bugs the reviewers found by reading and that only running can confirm are gone:

- **Drive 1:** adding and removing claim rows rapidly must not reuse an id, and the 50-entry cap
  must hold. The ids come from a `useRef` counter specifically to avoid collisions. If two rows
  share an id, React will drop one and the symptom will be a claim silently vanishing from the
  payload.
- **Drive 2:** the save path has a rollback — on a failed save the panel restores the previous
  selection. Rollback correctness depends on a **live `Set` reference** that every write copies
  before mutating. If that copying is wrong, a failed save leaves the panel showing a selection the
  server never accepted, or hides *everything* — the exact bug the Task 6 review caught in the plan.

Report what you actually observed on both, including if the transitions looked correct.

## What not to do

- Do not modify any file. This round is verification, not implementation. If you find a defect,
  report it with `file:line` and leave the tree alone.
- Do not `git add` anything. Uncommitted Reticle artifacts are in the tree by design.
- Do not create the "probe holder" account if it does not exist; use `alex.mercer@alumni.org` and
  report if the fixture is missing.
- Do not fix a failing verdict by loosening the check.

## Report

Write the full report to:
`/home/grim/Projects/CertiChain/.superpowers/sdd/2026-09-29-holder-controlled-disclosure/task-8b-report.md`

Structure:
- **Tooling** — which `reticle_*` tools were available, and anything that blocked the drives
- **Drive 1–4** — for each: the actions taken, the verdict with its exact `verified` value, and the
  `ground`/reason if it did not come back `yes`
- **State transitions** — what you observed on rapid row add/remove and on the cap; what you
  observed on a failed save and its rollback, if you exercised it
- **Defects** — anything wrong, with `file:line`. Even if you do not fix it.
- **Honesty statement** — an explicit count: how many drives returned `yes`, how many returned
  `unknown` or `no-fault`, and how many could not run at all

That last section must be accurate even though it is the least flattering. A run that reports four
`unknown` verdicts as four passes is worse than a run that reports the blocker, because the blocker
is the information.

Then reply to me with ONLY:
- **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED
- One line per drive: `Drive N (issuer|holder|verifier|untouched): verified=<value>`
- The honesty count
- Any defect found, with `file:line`

Under 20 lines. Detail goes in the report file.
