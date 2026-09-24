// A fixed set of synthetic reports for the bounded "Run live demo" feature.
// Deliberately contains only ids and report text — no expected labels, and
// no import from the evaluation dataset — so the client never knows or can
// display an "expected" answer. Every outcome shown during the demo comes
// from a real response through /api/analyze.
//
// 1 straightforward Maintenance-shaped report, 2 Quality, 2 Logistics,
// 2 Human Review, and 1 mixed-signal report (label defect + an unusual
// equipment noise, with no stated link between them) — interleaved.
// The mixed-signal report has previously produced a low-confidence
// Maintenance recommendation routed to Human Review in one manual run;
// that is historical context only, not a guaranteed or hardcoded outcome
// here — this run always uses the real API response.

export interface DemoReportFixture {
  id: string;
  report: string;
}

export const LIVE_DEMO_REPORTS: DemoReportFixture[] = [
  {
    id: "demo-1",
    report:
      "The main conveyor stopped abruptly and there is a loud grinding sound coming from the gearbox.",
  },
  {
    id: "demo-2",
    report:
      "Printed expiration dates on the film wrapping are smudged and hard to read on this batch.",
  },
  {
    id: "demo-3",
    report: "Something feels off on the floor today but I can't pinpoint what.",
  },
  {
    id: "demo-4",
    report:
      "We are out of shrink wrap at station 5; the sealer is working fine but sits idle waiting for stock.",
  },
  {
    id: "demo-5",
    report:
      "Labels are coming out smudged, and the label printer is making an unusual clicking noise. We haven't checked whether the two issues are connected.",
  },
  {
    id: "demo-6",
    report: "Several boxes from the last pallet have the wrong barcode printed on the label.",
  },
  {
    id: "demo-7",
    report:
      "Planned changeover in progress, line paused for a scheduled maintenance window, nothing wrong reported.",
  },
  {
    id: "demo-8",
    report:
      "The forklift bringing pallets from the warehouse is delayed, so the line has nothing to package.",
  },
];
