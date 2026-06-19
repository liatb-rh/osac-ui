# OSAC Data Spec Schema — Agent Instructions

This file explains the structure and conventions of the `data/osac/` spec folder
for AI agents working on OSAC features.

---

## Purpose

The `data/osac/` specs are **cross-layer alignment documents**. They map data objects,
API contracts, and implementation workflows across:

| Layer | Source |
|---|---|
| Frontend | `Projects/osac-ui` |
| API | `Projects/osac-backends/fulfillment-service` (proto) |
| Operator | `Projects/osac-backends/osac-operator` (CRD types) |
| Automation | `Projects/osac-backends/osac-aap` (Ansible playbooks) |
| Installer | `osac-installer` (external; add context manually) |
| BMaaS | `bare-metal-fulfillment-operator` (external; add context manually) |

---

## Folder Structure

```
data/osac/
  INDEX.yaml              ← master catalog; read this first
  _schema.md              ← this file (agent instructions)
  global/
    resource-envelope.yaml ← shared Metadata, Condition, ListResponse patterns
    rbac-model.yaml        ← Roles, RoleBindings, org/tenant scoping
    error-codes.yaml       ← error taxonomy and UI handling
  domains/
    compute-instances.yaml
    clusters.yaml
    baremetal-instances.yaml
    virtual-networks.yaml
    subnets.yaml
    security-groups.yaml
    public-ips.yaml
    storage.yaml
    catalog-items.yaml
    organizations.yaml
    identity-providers.yaml
    events.yaml
```

---

## Domain Spec Structure

Each `domains/<resource>.yaml` file follows this top-level structure:

```yaml
domain: <id>
title: <human title>
status: draft | review | stable
owner: <team or person>

layers:
  fulfillment_service:   # proto + REST API layer
  osac_operator:         # Kubernetes operator CRD layer
  osac_aap:              # Ansible playbooks layer
  osac_ui:               # Frontend UI flow layer
  osac_installer:        # (if applicable)
  bare_metal_fulfillment_operator:  # (if applicable)

data_model:
  spec_fields:           # desired state fields (user-controlled)
  status_fields:         # observed state fields (system-controlled)

lifecycle:
  states:
  transitions:

workflows:
  create: |  # Markdown narrative — end-to-end create workflow
  update: |  # Markdown narrative
  delete: |  # Markdown narrative

cross_layer_gaps:
  - gap: >   # Known misalignments between layers; must be resolved when encountered

open_questions:
  - question text
```

---

## How to Read a Spec

### Field table columns

| Column | Meaning |
|---|---|
| `name` | Logical field name |
| `proto_field` | Field path in the proto message |
| `operator_field` | Field path in the operator Go CRD struct |
| `ui_prop` | Property path in the TypeScript/React UI |
| `type` | Data type |
| `mutable` | Whether the field can be changed after creation |
| `notes` | Additional constraints, caveats, or cross-layer notes |

### Status indicators

- `# TODO: ...` — unverified or incomplete information; must be confirmed before use
- `""` (empty operator_field) — field mapping not yet confirmed from operator source
- `status: draft` — spec is partially populated; treat TODOs as gaps to fill

---

## How to Update a Spec

### When adding new context from chat:

1. Identify the relevant domain spec from `INDEX.yaml`.
2. Find the section to update (spec_fields, status_fields, workflows, cross_layer_gaps, open_questions).
3. Replace `TODO` placeholders with actual values from the provided context.
4. If a new field is discovered that's not in the spec, add a new entry to `spec_fields` or `status_fields`.
5. If a gap is resolved, remove or annotate the entry in `cross_layer_gaps`.
6. If an open_question is answered, remove it from `open_questions` and incorporate the answer into the spec body.
7. Update `status: draft` → `review` → `stable` as the spec becomes more complete.

### When the user provides backend context:

- **Proto source**: populate `proto_field` values and confirm types
- **Operator CRD Go types**: populate `operator_field` values; confirm immutability via `+kubebuilder:validation:XValidation` markers
- **AAP playbooks**: populate `aap_playbooks` lists and workflow narratives
- **osac-installer**: populate `storage.yaml` and any installer-managed resources
- **bare-metal-fulfillment-operator**: populate `baremetal-instances.yaml` operator section

---

## Key Cross-Layer Conventions

### ID conventions
- All resources use `id: string (UUID)` as primary key in the fulfillment-service API.
- **Exception**: `IdentityProvider` uses `name: string` as its key.
- In the operator, resources use `metadata.name` (a UUID or human-readable name) as the Kubernetes object name.

### Naming conventions
- Proto fields: `snake_case`
- JSON (HTTP API): `camelCase` (proto JSON mapping)
- Operator Go struct: `PascalCase` with `json:"camelCase"` tags
- TypeScript UI: `camelCase`

### Immutability
- Fields marked `mutable: false` correspond to operator CRD `+kubebuilder:validation:XValidation:rule="self == oldSelf"` markers.
- Immutable fields must not be shown as editable in UI update forms.

### State/Phase naming
- Proto uses `SCREAMING_SNAKE_CASE` enum values: `COMPUTE_INSTANCE_STATE_RUNNING`
- Operator uses `PascalCase` phase strings: `"Running"`
- UI should display localized/human-friendly versions; use the proto enum as the canonical state key

### Template parameters
- `template_parameters` uses `map<string, google.protobuf.Any>` in proto (with `@type` URL discriminator)
- Serialized as JSON string in operator CRD
- UI must send ProtoJSON format on create; fulfillment-service handles serialization

---

## Iterative Context Workflow

Context is added step-by-step in chat. Each step:

1. User pastes or describes new backend context (proto snippet, CRD type, playbook list, architecture note)
2. Agent identifies the affected domain spec(s) and section(s)
3. Agent updates the spec file with verified information, replacing `TODO` placeholders
4. Agent notes what was updated and what open questions remain

This is an **additive process** — nothing is deleted without explicit supersession.
