# Data Sources

This document records the origin of every piece of clinical data used in the seed knowledge nodes.

---

## Clinical Protocols & Drug Safety

| Node | Claim | Source |
|------|-------|--------|
| N-G01 | Warfarin + NSAID interaction → GI bleed risk | British National Formulary (BNF); WHO Model Formulary; PMID 9474401 (Ann Intern Med) |
| N-G02 | Penicillin allergy cross-reactivity with cephalosporins: 10% (1st gen), <2% (3rd gen) | PMID 11137725 (JAMA); UpToDate — "Allergy to penicillins" |
| N-G03 | Two-person blood transfusion verification | WHO Blood Safety guidelines; AABB Standards for Blood Banks, 31st Ed |
| N-G04 | WHO 5-moment hand hygiene | WHO "My 5 Moments for Hand Hygiene" (2009) |
| N-G05 | Verbal order documentation within 1 hour | Joint Commission NPSG.02.03.01; ISMP medication safety guidelines |
| N-G06 | Two-identifier patient verification | Joint Commission NPSG.01.01.01 |
| N-G08 | 72-hour antibiotic stewardship review | WHO Global Action Plan on Antimicrobial Resistance; IDSA Stewardship Guidelines 2016 |
| N-G09 | Morse Fall Scale threshold ≥45 = high risk | Morse JM (1989) — original Morse Fall Scale validation paper |
| N-O02 | Paracetamol 650mg QDS first-line post-TKR | AAOS Clinical Practice Guideline — Management of Osteoarthritis of the Knee (2021) |
| N-O06 | Enoxaparin 40mg DVT prophylaxis, 14d TKR / 28d THR | ACCP VTE Prophylaxis Guidelines (Chest, 2012); NICE NG89 |
| N-O09 | Physiotherapy within 24h of TKR | Cochrane Review: "Continuous passive motion following total knee arthroplasty" |
| N-C02 | High-sensitivity troponin 0-1 hour algorithm | ESC 2020 Guidelines for Non-ST-Elevation ACS |
| N-M01 | Diabetic fasting: adjust timing not dose; BG <70 break fast | ADA Standards of Medical Care in Diabetes (2024); IDF Guideline for Ramadan fasting |
| N-M03 | Basal insulin required alongside sliding scale | ADA/EASD consensus; PMID 17909083 (NEJM RABBIT-2 trial) |
| N-P01 | All paediatric doses weight-based (mg/kg) | WHO Essential Medicines for Children; BNFc (British National Formulary for Children) |

---

## Drug Dosing

| Node | Claim | Source |
|------|-------|--------|
| N-G01 | Paracetamol as NSAID alternative in anticoagulated patients | BNF; UpToDate |
| N-O02 | Tramadol 50mg escalation at VAS >6 | WHO Analgesic Ladder; standard Indian hospital formulary practice |
| N-D02 | Paracetamol 500-1000mg q4-6h, max 4g/day | BNF; FDA prescribing information |
| N-M04 | Metformin 1000mg BD + Glimepiride 2mg — Ekadashi fasting protocol | ADA/EASD diabetes management guidelines; clinical adaptation for Indian fasting practices |

---

## Emergency Codes

| Node | Claim | Source |
|------|-------|--------|
| N-G07 | Code Blue / Red / Pink / Grey / Orange definitions | Hospital emergency code standards (ACEP; Australian Standard AS 4083) — specific codes are institution-specific but follow these conventions |

---

## Cardiology

| Node | Claim | Source |
|------|-------|--------|
| N-C01 | Cardiac catheterization consent requirements | ACC/AHA Guideline on Coronary Artery Revascularization (2021) |
| N-C02 | Serial troponin 0-3-6h; hs-cTnI <5 ng/L early rule-out | ESC 2020 NSTEMI Guidelines; Abbott hs-cTnI assay reference ranges |
| N-C03 | ECHO required before discharge post-MI | AHA/ACC Secondary Prevention Guidelines; PMID 11592847 |
| N-C05 | DAPT 12 months post-DES; 6 months high bleeding risk | ESC 2023 Guidelines on Antiplatelet Therapy; NEJM DAPT study |

---

## General Medicine

| Node | Claim | Source |
|------|-------|--------|
| N-M02 | Sepsis Bundle: cultures before antibiotics, lactate <1h, 30mL/kg crystalloid | Surviving Sepsis Campaign 2021 Guidelines |
| N-M06 | Hydrocortisone 200mg + Chlorpheniramine pre-treatment for contrast allergy | ACR Manual on Contrast Media (2023), Version 10.3 |

---

## Derivability Scores — Methodology

Derivability scores (0.0–1.0) were assigned using the following heuristic rubric:

| Score Range | Criteria |
|---|---|
| 0.00–0.10 | Patient-specific data (Rajan's INR, Padma's fasting protocol) or highly institution-specific decisions |
| 0.10–0.30 | Institution-specific implementation of a guideline (Supra's specific drug choice, Supra's vendor) |
| 0.30–0.50 | Moderate specificity — institutional policy that overlaps with general guidelines |
| 0.50–0.70 | Borderline — factual content that could be partially derived from general knowledge |
| 0.70–1.00 | High derivability — general medical knowledge any LLM trained on PubMed/UpToDate would know |

Threshold of 0.7 (configured in `organizations.config.derivability_threshold`) means nodes scoring ≥0.7 are excluded from the candidate set. This is configurable per organization.

---

*This document was prepared alongside the technical assessment submission. All clinical data is used for demonstration purposes only and represents synthetic/illustrative content based on publicly available medical guidelines.*
