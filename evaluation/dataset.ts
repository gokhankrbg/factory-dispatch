// A small English-language smoke-evaluation dataset for the "which team
// should assess this first" routing policy. See ./README.md for how this
// will be used and its limitations.
//
// Expected labels are provisional, human-reviewable expectations written to
// match the demo policy in src/lib/team-question.ts — they are not
// independently verified industrial ground truth. Do not change an expected
// label later simply to match a model prediction; if a label looks wrong,
// fix the policy or the case rationale deliberately, as a reviewed change.
//
// The "holdout" group must remain unchanged while tuning the question,
// criteria, or threshold against the "development" group.

import type { TeamKey } from "@/lib/types";

export type EvaluationGroup = "development" | "holdout";

export interface EvaluationCase {
  id: string;
  report: string;
  expectedModelChoice: TeamKey;
  group: EvaluationGroup;
  rationale: string;
}

export const EVALUATION_DATASET: EvaluationCase[] = [
  // --- development / maintenance ---
  {
    id: "dev-maintenance-01",
    report:
      "The main conveyor stopped abruptly and there is a loud grinding sound coming from the gearbox.",
    expectedModelChoice: "maintenance",
    group: "development",
    rationale: "Clear equipment malfunction with abnormal noise.",
  },
  {
    id: "dev-maintenance-02",
    report: "Pump 3 tripped twice this morning and won't hold pressure anymore.",
    expectedModelChoice: "maintenance",
    group: "development",
    rationale:
      "Equipment malfunction (tripping, pressure loss); root cause unknown but the equipment symptom identifies maintenance.",
  },
  {
    id: "dev-maintenance-03",
    report: "The packaging robot arm stopped mid-cycle and I don't know why.",
    expectedModelChoice: "maintenance",
    group: "development",
    rationale:
      "Unknown root cause with a clear equipment stoppage symptom — maintenance per policy even without a known cause.",
  },

  // --- development / quality ---
  {
    id: "dev-quality-01",
    report:
      "Printed expiration dates on the film wrapping are smudged and hard to read on this batch.",
    expectedModelChoice: "quality",
    group: "development",
    rationale: "Printing/label defect on the product.",
  },
  {
    id: "dev-quality-02",
    report: "Several boxes from the last pallet have the wrong barcode printed on the label.",
    expectedModelChoice: "quality",
    group: "development",
    rationale: "Label/specification defect, no equipment fault reported.",
  },
  {
    id: "dev-quality-03",
    report:
      "The color of the coating on today's run looks noticeably off compared to the sample sheet.",
    expectedModelChoice: "quality",
    group: "development",
    rationale: "Product specification deviation.",
  },

  // --- development / logistics ---
  {
    id: "dev-logistics-01",
    report:
      "We are out of shrink wrap at station 5; the sealer is working fine but sits idle waiting for stock.",
    expectedModelChoice: "logistics",
    group: "development",
    rationale:
      "Equipment waiting for missing materials — stated cause is a material shortage, not an equipment fault.",
  },
  {
    id: "dev-logistics-02",
    report:
      "The forklift bringing pallets from the warehouse is delayed, so the line has nothing to package.",
    expectedModelChoice: "logistics",
    group: "development",
    rationale: "Material movement / replenishment delay.",
  },
  {
    id: "dev-logistics-03",
    report: "Raw material bins for line 1 were not restocked overnight and production can't start.",
    expectedModelChoice: "logistics",
    group: "development",
    rationale: "Inventory availability problem.",
  },

  // --- development / human_review ---
  {
    id: "dev-human_review-01",
    report: "Something feels off on the floor today but I can't pinpoint what.",
    expectedModelChoice: "human_review",
    group: "development",
    rationale: "Truly vague — insufficient information to identify a team.",
  },
  {
    id: "dev-human_review-02",
    report:
      "Planned changeover in progress, line paused for a scheduled maintenance window, nothing wrong reported.",
    expectedModelChoice: "human_review",
    group: "development",
    rationale: "Planned normal event with no reported fault, despite mentioning \"maintenance window\".",
  },
  {
    id: "dev-human_review-03",
    report:
      "There's a disagreement between two shifts about whether it's the equipment or the batch that's the problem; both look plausible.",
    expectedModelChoice: "human_review",
    group: "development",
    rationale: "Competing issues with no single clearly appropriate first team.",
  },

  // --- holdout / maintenance ---
  {
    id: "holdout-maintenance-01",
    report: "Line 2's motor started smoking briefly before the operator hit the emergency stop.",
    expectedModelChoice: "maintenance",
    group: "holdout",
    rationale: "Clear electrical/mechanical fault.",
  },
  {
    id: "holdout-maintenance-02",
    report:
      "The filling machine is making a rattling noise it never made before, though everything still appears to be running.",
    expectedModelChoice: "maintenance",
    group: "holdout",
    rationale: "Abnormal equipment noise, even though the machine is still operating.",
  },
  {
    id: "holdout-maintenance-03",
    report: "Press #4 shut down on its own twice this shift; no error code showing.",
    expectedModelChoice: "maintenance",
    group: "holdout",
    rationale: "Unknown root cause but a clear equipment stoppage symptom.",
  },

  // --- holdout / quality ---
  {
    id: "holdout-quality-01",
    report: "Carton dimensions are 2mm off spec on the current batch, though the machine settings weren't changed.",
    expectedModelChoice: "quality",
    group: "holdout",
    rationale: "Specification defect; explicit negation that machine settings changed points away from maintenance.",
  },
  {
    id: "holdout-quality-02",
    report: "Customer complaint: the printed lot number on yesterday's shipment doesn't match the production log.",
    expectedModelChoice: "quality",
    group: "holdout",
    rationale: "Labeling/record defect on shipped product.",
  },
  {
    id: "holdout-quality-03",
    report: "The new roll of labels is printing blurry text, but the printer itself seems to be running fine.",
    expectedModelChoice: "quality",
    group: "holdout",
    rationale:
      "Label defect without a clearly dominant equipment fault — incidental mention that the printer is fine argues against maintenance.",
  },

  // --- holdout / logistics ---
  {
    id: "holdout-logistics-01",
    report: "Packaging tape ran out mid-shift and the sealer, which works fine, is now idle.",
    expectedModelChoice: "logistics",
    group: "holdout",
    rationale:
      "Negation of an equipment fault (\"works fine\") plus a stated material shortage as the cause of the idle equipment.",
  },
  {
    id: "holdout-logistics-02",
    report: "Incoming components for the assembly cell haven't arrived from the supplier since yesterday.",
    expectedModelChoice: "logistics",
    group: "holdout",
    rationale: "Supply/replenishment delay.",
  },
  {
    id: "holdout-logistics-03",
    report: "The AGV shuttle is idle because there is no inventory queued at the pickup point.",
    expectedModelChoice: "logistics",
    group: "holdout",
    rationale:
      "Incidental mention of equipment (\"AGV shuttle\") but the stated cause is an inventory shortage, not equipment fault.",
  },

  // --- holdout / human_review ---
  {
    id: "holdout-human_review-01",
    report: "Not sure what's going on — someone mentioned an issue near station 7 earlier.",
    expectedModelChoice: "human_review",
    group: "holdout",
    rationale: "Vague secondhand report with insufficient information.",
  },
  {
    id: "holdout-human_review-02",
    report: "Scheduled downtime for calibration checks; no defects or faults reported during the stop.",
    expectedModelChoice: "human_review",
    group: "holdout",
    rationale: "Planned normal event with no reported fault.",
  },
  {
    id: "holdout-human_review-03",
    report: "Could be a machine problem or a quality issue with the incoming material — reports conflict.",
    expectedModelChoice: "human_review",
    group: "holdout",
    rationale: "Competing issues (equipment vs. material quality) without a clearly appropriate first owner.",
  },
];
