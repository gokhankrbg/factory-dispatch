# Evaluation dataset

This folder holds a small English-language dataset for smoke-testing the
routing policy in `src/lib/team-question.ts` (the Jev question) and
`src/lib/routing.ts` (the deterministic post-processing policy), plus the
runner (`run.ts`) that executes it against the real TypeSafe API.
`dataset.ts` is data only, checked by `dataset.test.ts` for structural
integrity (unique ids, expected group/label counts).

## Contents

`dataset.ts` exports `EVALUATION_DATASET`: 24 cases, each with:

- `id` — a unique, readable identifier
- `report` — the synthetic operator report text
- `expectedModelChoice` — the team the demo policy is expected to select
  (`maintenance`, `quality`, `logistics`, or `human_review`)
- `group` — `"development"` or `"holdout"`
- `rationale` — why that label follows the written policy

12 cases are `development` (3 per expected choice) and 12 are `holdout`
(3 per expected choice), covering: clear equipment faults, product/label
defects, material shortages that stop otherwise-working equipment,
unknown root causes with a clear equipment symptom, truly vague reports,
competing issues with no clear first owner, planned stops with no
reported fault, and negation / incidental mentions of another team's
terminology (e.g. "the sealer, which works fine, is now idle").

**Expected labels are provisional, human-reviewable expectations that
match the written demo policy — they are not independently verified
industrial ground truth.** Do not change an expected label later simply
to make a model prediction look correct; if a label seems wrong on
review, that's a deliberate, reviewed change to the case or the policy,
not a silent edit to make numbers agree.

**The `holdout` group must stay unchanged while tuning the question,
criteria, or `REVIEW_CONFIDENCE_THRESHOLD` against the `development`
group.** It exists to catch overfitting to the development cases.

24 synthetic cases are a **smoke evaluation**, meant to catch obvious
regressions in wording or policy — not a statistically powered or
production-validating benchmark.

## Running an evaluation

```bash
npm run evaluate -- --group dev
npm run evaluate -- --group holdout
```

See the root [README](../README.md#running-an-evaluation) for what the
runner does and the development-vs-holdout rules. For one actual run of
each group and its real results, see
[`docs/evaluation.md`](../docs/evaluation.md).

## Measurements reported

Each run calls `/api/analyze` for every case in the selected group and
reports, separately for development and holdout:

- **Model choice agreement** — how often `modelChoice` matches
  `expectedModelChoice`.
- **Share routed to Human Review** — the fraction of cases whose final
  routing is `human_review`, regardless of why.
- **Final-team agreement among automatically routed incidents** — among
  cases where `routing.reasonCode` is `direct_route` (i.e. not sent to
  Human Review), how often `routing.finalTeam` matches
  `expectedModelChoice`, reported alongside the **count** and
  **coverage** (share of all cases) that were automatically routed at
  all. Coverage and accuracy trade off against each other as the
  threshold changes, so both must be reported together.
- **Incorrect automatic routing of expected Human Review cases** — how
  often a case whose `expectedModelChoice` is `human_review` was instead
  automatically routed to a working team. This is the failure mode the
  review threshold exists to catch, so it is tracked on its own.
- **API round-trip latency** (`upstreamRoundTripMs`) — reported
  separately from every accuracy metric above, since latency measures
  the provider's response time, not decision quality.

See [`docs/evaluation.md`](../docs/evaluation.md) for one actual run of
each group with real values — every number there comes from the raw
JSON reports preserved in `docs/evaluation-evidence/`, unmodified.
Routine local runs are written to `evaluation/results/`, which stays
git-ignored.
