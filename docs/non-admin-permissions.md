# Non-admin permissions

This table documents the effective permissions currently enforced for non-admin users. Permissions
are cumulative: if an account is connected to both a country and a person, or the person has several
active relations, the account receives the union of the applicable permissions.

### Country and national consortium

| Non-admin account or active person relation | Country section and national consortium: view | National consortium: edit | Country report: read | Country report: edit | Country report: submit |
| ------------------------------------------- | --------------------------------------------- | ------------------------- | -------------------- | -------------------- | ---------------------- |
| connected to a country                      | Yes                                           | No                        | Yes                  | Yes                  | No                     |
| `national_coordinator`                      | Yes                                           | Yes                       | Yes                  | Yes                  | Yes                    |
| `national_coordinator_deputy`               | Yes                                           | Yes                       | Yes                  | Yes                  | Yes                    |
| `national_coordination_staff`               | Yes                                           | No                        | Yes                  | Yes                  | No                     |
| `national_representative`                   | Yes                                           | No                        | Yes                  | Yes                  | No                     |
| `national_representative_deputy`            | Yes                                           | No                        | Yes                  | Yes                  | No                     |

### Working groups

| Non-admin account or active person relation | Working-group section: view | Working group: edit | Working-group report: read | Working-group report: edit | Working-group report: submit |
| ------------------------------------------- | --------------------------- | ------------------- | -------------------------- | -------------------------- | ---------------------------- |
| `is_member_of`                              | Yes                         | No                  | Yes                        | Yes                        | No                           |
| `is_chair_of`                               | Yes                         | Yes                 | Yes                        | Yes                        | Yes                          |
| `is_vice_chair_of`                          | Yes                         | Yes                 | Yes                        | Yes                        | Yes                          |

## Constraints and terminology

- Person relations grant permissions only while their duration contains the current time.
- Country permissions apply to that country's currently related national consortium. The
  `is_national_consortium_of` relation must also be active.
- A non-admin organisation editor can change core details, image, description, and social-media
  links. Changes are saved as a draft. Non-admin editors cannot publish organisation drafts.
- The delegated organisation forms do not edit people, person relations, institutions,
  institution relations, unit relations, or general entity/resource relations.
- Report `edit` permission identifies who may edit. The report itself must additionally be in
  `draft` status and its reporting campaign must be `open`.
- In the permission utility, report `confirm` means permission to submit a draft report. National
  coordinators and deputies may submit country reports; working-group chairs and vice-chairs may
  submit working-group reports.
- Accepting a submitted report is a separate administrator-only action.
- Non-admin users cannot create or delete organisational units or reports through these
  permissions.
