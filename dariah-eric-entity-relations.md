# DARIAH ERIC Organisational Entity Types and Relations

Source: Statutes of DARIAH ERIC, Version February 2026.

---

## Preliminary notes on entity types

**Country vs. National Consortium — they are distinct:**

- A **Member/Observer** is the political entity (country or intergovernmental organisation) that
  holds membership. It is represented in governance by a **National Representing Entity** (a
  ministry or funding agency).
- A **National Consortium** is the _operational_ grouping of institutions within that country —
  composed of the **National Coordinating Institution** (NCI) plus at least one **Partner
  Institution**.
- The two are linked through the NCI, which the Member/Observer appoints, and which leads the
  National Consortium.

**Not in the statutes:**

- **Regional hubs** — not mentioned anywhere.
- **Working groups** — not mentioned by name; Art. 17.18 allows the General Assembly to establish
  _"other advisory bodies and committees"_ without specifying what they are called.
- **VCCs (Virtual Competence Centres)** — not mentioned anywhere in the February 2026 statutes.
  Confirmed deprecated/removed.

---

## Entity types defined in the statutes

| Abbreviation | Entity Type                       | Definition (Art. 11 unless noted)                                                                                  |
| ------------ | --------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| ERIC         | DARIAH ERIC                       | The legal entity itself (Art. 1)                                                                                   |
| MBR          | Member                            | Country or IGO with full membership (Art. 12.1)                                                                    |
| OBS          | Observer                          | Country or IGO with observer status, no voting rights (Art. 12.2)                                                  |
| CP           | Cooperating Partner               | Institution from a non-Member/Observer country (Art. 11)                                                           |
| NRE          | National Representing Entity      | Ministry/funding agency formally representing a Member/Observer in DARIAH ERIC                                     |
| NCI          | National Coordinating Institution | National institution appointed by Member/Observer to represent it operationally and coordinate national activities |
| NC           | National Coordinator              | Person appointed by NCI; scientific leader of National Consortium; link to DARIAH ERIC                             |
| NCON         | National Consortium               | Grouping of NCI + ≥1 Partner Institution within a Member/Observer country                                          |
| PI           | Partner Institution               | Institution contributing to DARIAH, part of NCON or approved by NC                                                 |
| GA           | General Assembly                  | Governing body with full decision-making powers (Art. 17)                                                          |
| BOD          | Board of Directors                | Executive body and legal representative (Art. 18)                                                                  |
| SAB          | Scientific Advisory Board         | Advisory body on scientific/technical matters (Art. 19)                                                            |
| SMT          | Senior Management Team            | Operational coordination body (Art. 20)                                                                            |
| NCC          | National Coordinator Committee    | Operational organ, coordinates national activities at European level (Art. 21)                                     |
| JRC          | Joint Research Committee          | Operational organ, aligns scientific/technical vision (Art. 22)                                                    |
| DCO          | DARIAH Coordination Office        | Administrative/coordination unit supporting all DARIAH bodies (Art. 11)                                            |

---

## Non-governance structural relations

| Source              | Target              | role                     | Notes                                                                            |
| ------------------- | ------------------- | ------------------------ | -------------------------------------------------------------------------------- |
| Country             | ERIC                | `member`                 | full membership with voting rights                                               |
| Country             | ERIC                | `observer`               | observer status, no vote                                                         |
| Institution         | Country             | `represents`             | formally represents the country in ERIC governance (NRE role)                    |
| Institution         | Country             | `coordinates`            | operationally coordinates national activities for the country (NCI role)         |
| Institution         | National Consortium | `lead`                   | coordinating/lead institution of the consortium (NCI role within the consortium) |
| Institution         | National Consortium | `partner`                | contributing partner institution                                                 |
| Institution         | ERIC                | `cooperating_partner`    | institution from a non-member country with a bilateral agreement                 |
| National Consortium | Country             | `national_consortium_of` | the consortium is the national operational grouping of that country              |
| National Consortium | ERIC                | `contributes_to`         | operational participation — contributes knowledge, expertise, in-kind work       |

**Notes:**

- An institution can hold multiple roles simultaneously (e.g. same institution can be both
  `represents` and `coordinates` toward the same country when NRE = NCI, and also `lead` toward the
  National Consortium).
- Country→ERIC `member`/`observer` = political/legal participation. National Consortium→ERIC
  `contributes_to` = operational participation. Both are needed.
- The National Consortium→Country relation is derivable from the institution relations but useful to
  store explicitly for querying.

---

## Full governance relations table

| Entity A             | Relation                                        | Entity B                                                     | Statutory basis    |
| -------------------- | ----------------------------------------------- | ------------------------------------------------------------ | ------------------ |
| MBR                  | **is member of**                                | ERIC                                                         | Art. 12.1          |
| OBS                  | **is observer of**                              | ERIC                                                         | Art. 12.2          |
| CP                   | **has cooperation agreement with**              | ERIC                                                         | Art. 12.9, 13.3    |
| MBR                  | **appoints**                                    | NRE                                                          | Art. 11            |
| OBS                  | **appoints**                                    | NRE                                                          | Art. 11            |
| MBR                  | **appoints**                                    | NCI                                                          | Art. 12.5          |
| OBS                  | **appoints**                                    | NCI                                                          | Art. 12.6          |
| NRE                  | **formally represents**                         | MBR or OBS (in ERIC)                                         | Art. 11            |
| NRE                  | **appoints**                                    | National Representative (person)                             | Art. 11            |
| NCI                  | **leads / is part of**                          | NCON                                                         | Art. 11            |
| NCI                  | **appoints**                                    | NC (person)                                                  | Art. 11, Art. 21.2 |
| PI                   | **is part of**                                  | NCON                                                         | Art. 11            |
| NC                   | **is scientific leader of**                     | NCON                                                         | Art. 11            |
| NC                   | **acts as link between**                        | ERIC and NCON                                                | Art. 11            |
| NC                   | **is member of**                                | NCC                                                          | Art. 21.2          |
| GA                   | **governs / has decision-making power over**    | ERIC                                                         | Art. 17.1          |
| GA                   | **appoints**                                    | BOD members                                                  | Art. 18.1          |
| GA                   | **appoints**                                    | SAB members                                                  | Art. 19.1          |
| GA                   | **approves admission of**                       | MBR, OBS, CP                                                 | Art. 17.12         |
| GA                   | **may establish**                               | other advisory bodies and committees                         | Art. 17.18         |
| GA                   | **is composed of**                              | National Representatives (MBR, with vote; OBS, no vote)      | Art. 17.1          |
| BOD                  | **is executive body / legal representative of** | ERIC                                                         | Art. 18.1          |
| BOD                  | **is accountable to**                           | GA                                                           | Art. 18.1          |
| BOD                  | **supervises**                                  | SMT                                                          | Art. 18.4h         |
| BOD                  | **consults**                                    | SMT                                                          | Art. 20.2          |
| BOD                  | **manages and employs**                         | DCO                                                          | Art. 18.4i         |
| BOD                  | **prepares budget for**                         | GA                                                           | Art. 23.1          |
| BOD                  | **is invited to attend**                        | NCC meetings                                                 | Art. 21.2          |
| BOD                  | **members are part of**                         | SMT                                                          | Art. 20.1          |
| SAB                  | **provides advice and guidance to**             | GA and all DARIAH bodies                                     | Art. 19.6          |
| SAB                  | **may submit amendment proposals to**           | GA                                                           | Art. 4.1           |
| SAB Chair            | **is invited to attend**                        | SMT meetings                                                 | Art. 20.1          |
| SMT                  | **is composed of**                              | NCC Chair/Vice-Chair(s) + JRC Chair/Vice-Chair + BOD members | Art. 20.1          |
| SMT                  | **is consulted by**                             | BOD                                                          | Art. 20.2          |
| NCC                  | **integrates and coordinates**                  | national DARIAH activities (at European level)               | Art. 21.1          |
| NCC                  | **is composed of**                              | NC (one per MBR/OBS)                                         | Art. 21.2          |
| NCC Chair/Vice-Chair | **are members of**                              | SMT                                                          | Art. 21.3          |
| JRC                  | **advises**                                     | BOD (on scientific/technical alignment)                      | Art. 22.1          |
| JRC                  | **is composed of**                              | 6–10 experts from MBR/OBS countries                          | Art. 22.2          |
| JRC Chair/Vice-Chair | **are members of**                              | SMT                                                          | Art. 22.3          |
| DCO                  | **coordinates activities of**                   | ERIC                                                         | Art. 2.3           |
| DCO                  | **supports and integrates all levels of**       | ERIC (GA, SAB, BOD, SMT, NCC, JRC)                           | Art. 11            |
| DCO officers         | **are invited to attend**                       | SMT meetings                                                 | Art. 20.1          |
| DCO officers         | **are invited to attend**                       | NCC meetings                                                 | Art. 21.2          |

---

## Summary of open points for data modelling

- **Country ≠ National Consortium**: model them as separate types. A country (Member/Observer) has-a
  NRE (for governance) and has-a NCI (for operations); the NCI leads the NCON.
- **Institutions** appear in three distinct roles: NRE, NCI, and PI — these may be the same
  institution (e.g. Serbia's NRE and NCI are both the Ministry) or different ones.
- **Regional hubs** and **working groups** are not statutory entity types; they would need to be
  modelled as extensions (perhaps as instances of Art. 17.18 "other bodies and committees").
- **VCCs** are entirely absent — safe to exclude.
