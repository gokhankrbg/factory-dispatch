# Evaluation results

This documents one actual, real-API evaluation run of each dataset group
(`development` and `holdout`), produced by `npm run evaluate -- --group dev`
and `npm run evaluate -- --group holdout` against the live TypeSafe Jev
API. The raw JSON reports are preserved unmodified in
[`docs/evaluation-evidence/`](./evaluation-evidence/). No values below
have been edited; they are read directly from those two files.

This is a **12+12 case smoke evaluation of synthetic, hand-written
reports** — see [`evaluation/README.md`](../evaluation/README.md) for
the dataset itself and its limitations. It demonstrates that the
integration works end-to-end against real API responses; it is not a
statistically powered or industrially validated benchmark, and these
sample sizes are too small to support a general accuracy claim.

## Run metadata

Both runs used the **same question configuration** — confirmed by an
identical `questionConfigHash` (`e4072d6e6f5e948bfe...`) in both reports
— so the two groups are directly comparable.

| | Development | Holdout |
|---|---|---|
| Timestamp (UTC) | 2026-09-24T09:38:06.180Z | 2026-09-24T09:40:00.321Z |
| Cases | 12 | 12 |
| Requested model | `jev-latest` | `jev-latest` |
| Returned model version | `jev-1.13.0` | `jev-1.13.0` |
| Review threshold | 0.70 | 0.70 |
| Dataset hash | `a04fd2cc564f103d...` | `07d0cbf00c449097...` |

## Metrics

All counts are shown with their denominators; see
[`evaluation/README.md`](../evaluation/README.md) for exactly what each
metric means and how it's computed.

| Metric | Development | Holdout |
|---|---|---|
| Attempted / successful / failed / unattempted | 12 / 12 / 0 / 0 | 12 / 12 / 0 / 0 |
| Model-choice agreement (of successful) | 12/12 (100%) | 12/12 (100%) |
| Human Review share (of successful) | 3/12 (25%) | 3/12 (25%) |
| Auto-routing coverage (of successful) | 9/12 (75%) | 9/12 (75%) |
| Final-team agreement among auto-routed | 9/9 (100%) | 9/9 (100%) |
| Expected-Human-Review cases incorrectly auto-routed | 0/3 (0%) | 0/3 (0%) |
| API round-trip latency (successful only) | median 244 ms, p95 841 ms (n=12) | median 298 ms, p95 795 ms (n=12) |

Latency is API round-trip time (network plus provider processing), not
pure model inference time, and is measured on the server around the
upstream request. The p95 figures are descriptive of these two 12-case
samples only, not a stable production performance estimate.

## Did confidence-threshold routing occur?

**No.** In both runs, every one of the 6 total Human Review outcomes
(3 per group) had `reasonCode: "model_requested_review"` — the model
itself selected Human Review directly, at 0.95–1.00 confidence in every
case. `reasonCode: "below_confidence_threshold"` never appeared in
either run: every non-review case the model answered cleared the 0.70
threshold comfortably (confidence 0.96–1.00). This means these two runs
demonstrate the "model requested review" path working correctly, but do
**not** exercise or validate the below-threshold routing path — that
would require cases where the model answers a working team with
lower confidence, which this dataset's reports (being written for
clarity, not ambiguity calibration) did not produce.

## Synthetic labels and sample-size limitations

- `expectedModelChoice` values in the dataset are the authors'
  provisional, human-reviewable expectations written to match the
  policy in `src/lib/team-question.ts` — not independently verified
  industrial ground truth.
- 12 cases per group (3 per team) is too small to bound an error rate
  with any statistical confidence; a single misclassification would
  swing the agreement rate by over 8 percentage points.
- Both runs happened within the same session, two minutes apart,
  against the same returned model version — they say nothing about
  consistency across time, model versions, or a larger or more
  adversarial set of reports.
- Confidence is not accuracy: a high-confidence answer that happens to
  match `expectedModelChoice` in this dataset is not evidence the model
  is calibrated in general.

## Do not

- Do not treat these two runs as proof the system is production-ready.
- Do not average or otherwise mix this data with later live-demo or
  Presentation-view session latency — those are a different, unlabeled,
  interactive workload, not this evaluation.
- Do not rerun and overwrite these two files to "improve" the numbers;
  the holdout group in particular is only a meaningful check the first
  time it's used after any tuning (see `evaluation/README.md`).
