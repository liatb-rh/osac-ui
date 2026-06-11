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
  /** JSON Schema draft-07 for dynamic form generation */
  paramSchema?: object
}
