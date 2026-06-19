// ---------------------------------------------------------------------------
// Full spec CatalogItem model (v2) — used by tenant admin + tenant user pages.
// The simpler CatalogItem in cards/CatalogItemCard.tsx is kept for backward compat.
// ---------------------------------------------------------------------------

export type CatalogItemType = 'vm' | 'cluster' | 'baremetal'

export type WorkloadProfile =
  | 'high-performance'
  | 'machine-learning'
  | 'data-processing'
  | 'analytics'

export interface CatalogItemFixedDefaults {
  cpu?: number
  memoryGib?: number
  bootDiskSizeGib?: number
  allowUserResize?: boolean
  ocpVersion?: string
  nodeProfile?: string
}

// ---------------------------------------------------------------------------
// FieldDefinition — mirrors fulfillment-service FieldDefinition proto.
// Used by CatalogItemStudio and CatalogFormPreview.
// ---------------------------------------------------------------------------

export type FieldComponentType = 'text' | 'number' | 'boolean' | 'select' | 'textarea' | 'password'

export interface FieldDefinitionValidation {
  /** For number fields */
  min?: number
  max?: number
  step?: number
  /** For text / textarea fields */
  minLength?: number
  maxLength?: number
  pattern?: string
  /** For textarea fields */
  rows?: number
}

export interface FieldDefinition {
  /** Local UI key — use crypto.randomUUID() on creation */
  id: string
  /** Dot-notation path into the resource spec, e.g. "spec.cores" */
  path: string
  displayName: string
  componentType: FieldComponentType
  /** false = locked read-only default; user cannot override at provision time */
  editable: boolean
  defaultValue?: string | number | boolean
  /** Enum options — select component type only */
  options?: string[]
  validation?: FieldDefinitionValidation
}

// ---------------------------------------------------------------------------
// StudioTemplate — minimal template descriptor passed into CatalogItemStudio.
// Avoids importing the app-level BackingTemplate type into libs.
// ---------------------------------------------------------------------------

export interface StudioTemplate {
  id: string
  name: string
  type: CatalogItemType
  description?: string
}

// ---------------------------------------------------------------------------
// FullCatalogItem
// ---------------------------------------------------------------------------

export interface FullCatalogItem {
  id: string
  metadata: { name: string; labels?: Record<string, string> }
  title: string
  description?: string
  icon?: string
  type: CatalogItemType
  workloadProfile?: WorkloadProfile
  tags?: string[]
  published: boolean
  tenantEnabled?: boolean
  /** Stored; never shown to tenantUser */
  templateRef: string
  fixedDefaults: CatalogItemFixedDefaults
  /** Structured field definitions — supersedes paramSchema */
  fieldDefinitions?: FieldDefinition[]
  /** @deprecated Use fieldDefinitions instead. Kept for backward compatibility. */
  paramSchema?: object
}
