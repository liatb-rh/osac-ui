import { type ClusterTemplate, normalizeRunStrategyWire } from '@osac/api-contracts'
import type { WizardState } from './types'

/** WIZARD_TEMPLATE_ONLY: wizard UI is template-only; other modes kept in types for RESTORE. */

/** Demo bounds until product policy API exists (aligned with BFF validation). */
export const TEMPLATE_BOOT_DISK_MIN_GIB = 1
export const TEMPLATE_BOOT_DISK_MAX_GIB = 512

export const TEMPLATE_CORES_MIN = 1
export const TEMPLATE_CORES_MAX = 128
export const TEMPLATE_MEMORY_GIB_MIN = 1
export const TEMPLATE_MEMORY_GIB_MAX = 512

export function defaultTemplateBootDiskGib(
  template: Pick<ClusterTemplate, 'defaultBootDiskSizeGib'> | null,
): number {
  return template?.defaultBootDiskSizeGib ?? 40
}

/** Valid strictly-positive integer GiB within demo bounds, or null. */
export function parseTemplateBootDiskGibInput(raw: string): number | null {
  const t = raw.trim()
  if (!/^\d+$/.test(t)) return null
  const n = Number(t)
  if (n < TEMPLATE_BOOT_DISK_MIN_GIB || n > TEMPLATE_BOOT_DISK_MAX_GIB) return null
  return n
}

/** Strictly-positive int32 in demo bounds, or null if empty/invalid. */
export function parseTemplateCoresInput(raw: string): number | null {
  const t = raw.trim()
  if (!/^\d+$/.test(t)) return null
  const n = Number(t)
  if (n < TEMPLATE_CORES_MIN || n > TEMPLATE_CORES_MAX) return null
  return n
}

/** Memory GiB in demo bounds, or null if empty/invalid. */
export function parseTemplateMemoryGibInput(raw: string): number | null {
  const t = raw.trim()
  if (!/^\d+$/.test(t)) return null
  const n = Number(t)
  if (n < TEMPLATE_MEMORY_GIB_MIN || n > TEMPLATE_MEMORY_GIB_MAX) return null
  return n
}

/** Comma/semicolon/whitespace-separated GiB sizes → `additional_disks[].size_gib`. Empty → []. Invalid → null. */
export function parseTemplateAdditionalDisksGibInput(raw: string): number[] | null {
  const t = raw.trim()
  if (t === '') return []
  const parts = t
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const out: number[] = []
  for (const p of parts) {
    if (!/^\d+$/.test(p)) return null
    const n = Number(p)
    if (n < TEMPLATE_BOOT_DISK_MIN_GIB || n > TEMPLATE_BOOT_DISK_MAX_GIB) return null
    out.push(n)
  }
  return out
}

/** Comma-separated fulfillment ids for `spec.security_groups`. Empty → []. */
export function parseTemplateSecurityGroupsInput(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export const INITIAL_STATE: WizardState = {
  // WIZARD_TEMPLATE_ONLY: was `mode: 'new'` — RESTORE when deployment picker returns.
  mode: 'template',
  osFamilyNew: '',
  osTypeNew: '',
  bootSource: null,
  cpuNew: '2',
  memoryNew: '4',
  cloudInitUserDataNew: '',
  selectedTemplateId: null,
  templateBootDiskSizeGib: '',
  templateCores: '',
  templateMemoryGib: '',
  templateRunStrategy: 'Always',
  templateSubnetId: '',
  templateSecurityGroupsRaw: '',
  templateSshPublicKey: '',
  templateUserData: '',
  templateImageSourceType: '',
  templateImageSourceRef: '',
  templateAdditionalDisksGibRaw: '',
  templateVmName: '',
  cloneSourceVmId: null,
  cloneNewName: '',
  startAfterCreate: true,
}

/** Merge BFF draft over defaults so omitted keys (older sessions) keep sensible defaults. */
export function draftFromSession(serverDraft: Partial<WizardState>): WizardState {
  const merged = { ...INITIAL_STATE, ...serverDraft }
  merged.templateRunStrategy =
    normalizeRunStrategyWire(merged.templateRunStrategy) ?? INITIAL_STATE.templateRunStrategy
  return merged
}

/** Guest OS step: card ids must match BFF `osFamilyNew` / `osMap` keys (`rhel`, `windows`, `linux`). */
export const GUEST_OS_FAMILIES = [
  {
    id: 'rhel',
    title: 'RHEL',
    description: 'Red Hat Enterprise Linux images for supported releases.',
  },
  {
    id: 'windows',
    title: 'Microsoft Windows',
    description: 'Windows Server and other Microsoft guest images.',
  },
  {
    id: 'linux',
    title: 'Other Linux',
    description: 'Ubuntu, Debian, CentOS Stream, and similar distributions.',
  },
] as const

export const OS_TYPES: Record<string, string[]> = {
  rhel: ['RHEL 9', 'RHEL 8', 'RHEL 7'],
  windows: ['Windows Server 2022', 'Windows Server 2019', 'Windows 11'],
  linux: ['Ubuntu 22.04 LTS', 'Ubuntu 20.04 LTS', 'Debian 12', 'CentOS Stream 9'],
}
