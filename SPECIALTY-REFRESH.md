# Specialty Config Annual Refresh Playbook

How to re-verify the 21 ST1/CT1 specialty configs (`lib/specialties/*.ts`) each recruitment
cycle. Configs are grouped by their **pre-interview gate** (`selectionProcess.preInterview.gate`),
because every specialty in a group shares one shortlisting mechanism and therefore one update
recipe. Run this once per cycle, when NHS England publishes the new person specs (usually
early autumn).

Scope rules (do not relitigate):

- **ST1/CT1 entry level only.** Never re-add HST (ST3/ST4) configs; the denylist in
  `tests/lib/specialties/config-invariants.test.ts` pins this.
- **Official sources only**: medical.hee.nhs.uk, NHS England recruitment offices (ANRO,
  Wessex, IMT Recruitment), royal colleges that run recruitment (RCPCH). Never third-party
  prep sites, never Reddit/forums, never the old lead spreadsheet.
- **Anything unverifiable gets marked, not asserted.** If an official page is unreachable or
  stale, record that in the config's `sources[]` entry (see the Neurosurgery and OMFS
  `UNVERIFIABLE`/`UNREACHABLE` entries for the pattern) and remove the fact from user-facing
  data rather than carrying it forward.
- Every specialty keeps its essentials and desirable evidence-upload domains regardless of
  gate group; the gate only changes when and how the score matters.

## The staleness check

Each config carries `sources: [{ url, claim, lastVerified }]`. The invariants test asserts
every `lastVerified` is a valid past date **no older than 18 months**, so a skipped annual
refresh eventually fails `npm run test` on purpose. When you complete a group's re-verification,
update `lastVerified` on every source you actually re-checked (never bulk-update dates you
did not check).

Per config, also re-check:

- `cycleYear` - bump only when the new cycle's person spec is actually published.
- `selectionProcess.cycleSpecific: true` flags a fact known to change between cycles;
  re-verify those first (see groups D and the O&G bypass below).
- `source` / `sourceLabel` still resolve (NHS England reshuffles URLs frequently).

## Group A: self-assessment score ranks you (`self_assessment_rank`)

IMT, ACCS Internal Medicine, Histopathology, Cardiothoracic. Portfolio counts **before**
interview; these carry full points matrices, so band wording and point values must match the
official matrix exactly.

| Config | Re-verify at |
| --- | --- |
| `imt-2026.ts`, `accs_am_2026.ts` | https://www.imtrecruitment.org.uk/recruitment-process/applying/application-scoring |
| `histopathology_st1_2026.ts` | https://medical.hee.nhs.uk/medical-training-recruitment/medical-specialty-training/pathology/histopathology/histopathology-st1-training-self-assessment-scoring-guidance-for-applicants |
| `cardiothoracic_st1_2026.ts` | https://wessex.hee.nhs.uk/medical-dental-training-recruitment/core-and-specialty/cardiothoracic-surgery-st1-st4-national-recruitment/ (applicant guide + self-assessment criteria PDFs are re-uploaded with new filenames each cycle; the 2026 ones live under wessex.hee.nhs.uk/wp-content/uploads/sites/6/2025/10/) |

Recipe: diff every domain's bands against the new matrix, re-check `totalMax` (IMT 30,
Histopathology 71, Cardiothoracic 59 in 2026), re-check bonus points (IMT/ACCS-IM 5-pt
Round 1 bonus), and confirm Cardiothoracic still skips the MSRA and still uses the
cut-off-or-within-6-points evidence-verification rule.

## Group B: assessor-scored written application (`assessor_scored_written`)

Paediatrics only.

- https://www.rcpch.ac.uk/education-careers/apply-paediatrics/ST1
- Scoring guidance PDF is re-issued each cycle under rcpch.ac.uk/sites/default/files/
  (2026-27: `st1_scoring_guidance_glossary_for_shortlisting_2026-27_v.4_jac_271025.pdf`).

Recipe: re-check the per-assessor marks split (2026-27: 30 marks x 2 assessors; sections
8/8/5/3+1/5, 50-word answers), that shortlisting scores are still not carried into interview,
and the interview format (two 20-min Qpercom stations).

## Group C: MSRA ranks you to interview (`msra_rank`)

Radiology, CST, Anaesthetics, ACCS Anaesthetics, O&G, Ophthalmology, Neurosurgery, ACCS EM,
CSRH. Portfolio does **not** move the shortlist; it counts at interview. Re-verify the MSRA
cut-off/ranking mechanics and any published final-score weights.

| Config | Re-verify at |
| --- | --- |
| `radiology_st1_2026.ts` | https://medical.hee.nhs.uk/medical-training-recruitment/medical-specialty-training/clinical-radiology/core-clinical-radiology/overview-of-core-training/applying-for-st1-training (2026: min 201 per component; ~top 850 evidence, ~top 700 interview; **no published weight split** - do not invent one) |
| `cst_2026.ts` | https://medical.hee.nhs.uk/medical-training-recruitment/medical-specialty-training/surgery/core-surgery/overview-of-core-surgery-training/applying-for-core-training (2026: MSRA 10% / portfolio 45% / management+clinical 45%, exact wording) |
| `anaesthetics_ct1_2026.ts`, `accs_anaes_2026.ts` | https://anro.wm.hee.nhs.uk/ct1 - download the new cycle's Applicant Guidance PDF (2026: MSRA 15%, PD/CPS 7.5% each, interview 85% as the only other component) |
| `og_st1_2026.ts` | https://medical.hee.nhs.uk/medical-training-recruitment/medical-specialty-training/obstetrics-and-gynaecology/st1-obstetrics-and-gynaecology/overview-of-st1-obstetrics-and-gynaecology/interviews |
| `ophthalmology_st1_2026.ts` | Person spec + MSRA specialty list + interview schedule (no numeric matrix published) |
| `neurosurgery_st1_2026.ts` | Person spec; weights only on the bot-gated Y&H deanery site (trap below) |
| `accs_em_2026.ts` | Person spec (no published weights) |
| `csrh_st1_2026.ts` | Person spec + MSRA specialty list + interview schedule |

### Known traps in group C

- **O&G stale scoring page**: https://medical.hee.nhs.uk/medical-training-recruitment/medical-specialty-training/obstetrics-and-gynaecology/st1-obstetrics-and-gynaecology/scoring-overview
  is titled "Scoring overview (August 2023 intake)" (MSRA 50 + interview 100 of 150, top-75
  MSRA bypass). It ranks well in search and looks current. Do not use it unless the title now
  names the current intake. A bypass for top MSRA scorers still exists but its threshold is
  unpublished.
- **Neurosurgery weights are bot-gated**: the national lead office is Yorkshire & Humber and
  the MSRA/interview split (previously cited as 40/60) lives only on
  https://www.yorksandhumberdeanery.nhs.uk/, which sits behind bot protection and cannot be
  fetched programmatically. Either verify manually in a browser or keep the weights
  unasserted.

## Group D: the MSRA is the whole selection (`msra_is_selection`)

GP, Core Psychiatry, Child & Adolescent Psychiatry, Psychiatry of Learning Disability.
**All four are `cycleSpecific` - re-verify first each cycle**; an interview stage could
return at any point.

- GP: https://medical.hee.nhs.uk/medical-training-recruitment/medical-specialty-training/general-practice-gp/how-to-apply-for-gp-specialty-training/gp-specialty-training-recruitment/general-practice-overview
  (2026: no selection centre; UK-wide offers on MSRA via Single Transferable Score). Note
  gprecruitment.hee.nhs.uk now 301-redirects into medical.hee.nhs.uk - do not cite it as a
  separate office.
- Psychiatry (all three share one application): https://medical.hee.nhs.uk/medical-training-recruitment/medical-specialty-training/psychiatry/core-psychiatry-training/overview-of-core-psychiatry-training/applying-for-core-training
  plus the MSRA subpage .../overview-of-core-psychiatry-training/msra for the appointability
  threshold (2026: raw 186 in each paper; PD paper weighted more on ties). The threshold is
  NOT on the applying page - check the MSRA subpage.

Recipe: if interviews return, move the affected configs to group C (`msra_rank`), add the
interview stage back to `stages`, and update the modal grouping expectations in tests.

## Group E: own tests plus selection centre (`cognitive_tests`)

Public Health, PH & GP Dual.

- Person specs (essentials): the person-spec URLs in each config's `sources`.
- PH selection process: Stage 1 Watson-Glaser + RANRA + SJT, Stage 2 selection centre.
- Dual programme: the NHS England GP section hosts the dual-CCT pages; final ranking is
  equally weighted between PH and GP (2026). Re-check both parent-specialty processes since
  the dual inherits them (including group D's GP facts).

## Group F: no gate, all eligible interviewed (`none_all_eligible`)

OMFS only.

- Person spec (dual medical + dental qualification essentials).
- Confirm OMFS is still absent from the NHS England MSRA specialty list.
- **Broken Severn redirects**: the historic OMFS national-recruitment detail pages on
  severndeanery.nhs.uk 301-redirect to southwest.pgmdeducation.nhs.uk, which does not resolve.
  If NHS England South West republishes the self-assessment/evidence guidance on a working
  host, ingest it as a real points config (the Cardiothoracic ingestion in
  `cardiothoracic_st1_2026.ts` is the template) and move OMFS to group A.

## After any data change

1. Update `sources[].lastVerified` for everything actually re-checked.
2. Update `tests/lib/specialties/config-invariants.test.ts` if totals or group membership
   changed (e.g. Cardiothoracic `totalMax`, the gate-group counts).
3. Run all four gates: `npm run typecheck && npm run lint && npm run test && npm run build`.
4. Work on a branch; pushing `main` deploys production.
