/**
 * Browser-side wizard session store — mirrors BFF routes/createVmWizard.ts.
 * Used exclusively by the MSW wizard handlers.
 */
import {
  type ComputeInstance,
  type OsType,
  VM_TEMPLATES,
  normalizeRunStrategyWire,
} from '@osac/api-contracts'
import { vmStore } from './vm-store'

// ---------------------------------------------------------------------------
// Types (mirror BFF WizardDraft — identical to frontend WizardState)
// ---------------------------------------------------------------------------

type DeploymentMode = 'new' | 'template' | 'clone'

interface WizardDraft {
  mode: DeploymentMode
  osFamilyNew: string
  osTypeNew: string
  bootSource: 'volume' | 'none' | null
  cpuNew: string
  memoryNew: string
  cloudInitUserDataNew: string
  selectedTemplateId: string | null
  templateBootDiskSizeGib: string
  templateCores: string
  templateMemoryGib: string
  templateRunStrategy: string
  templateSubnetId: string
  templateSecurityGroupsRaw: string
  templateSshPublicKey: string
  templateUserData: string
  templateImageSourceType: string
  templateImageSourceRef: string
  templateAdditionalDisksGibRaw: string
  templateVmName: string
  cloneSourceVmId: string | null
  cloneNewName: string
  startAfterCreate: boolean
}

export interface WizardSession {
  draft: WizardDraft
  skipDeployment: boolean
  activeIndex: number
  entry: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BOOT_DISK_MIN = 1
const BOOT_DISK_MAX = 512
const CORES_MIN = 1
const CORES_MAX = 128
const MEM_MIN = 1
const MEM_MAX = 512

const INITIAL_DRAFT: WizardDraft = {
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

const STEP_LABELS: Record<string, string> = {
  deployment: 'Select a creation method',
  'guest-os': 'Guest operating system',
  'boot-source': 'Boot source',
  compute: 'Compute resources',
  template: 'Templates',
  'clone-source': 'Source VM',
  customization: 'Customization',
  review: 'Review',
}

// ---------------------------------------------------------------------------
// Session store
// ---------------------------------------------------------------------------

export const sessions = new Map<string, WizardSession>()

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseIntRange(raw: string, min: number, max: number): number | null {
  const t = raw.trim()
  if (!/^\d+$/.test(t)) return null
  const n = Number(t)
  return n >= min && n <= max ? n : null
}

function parseAdditionalDisks(raw: string): number[] | null {
  const t = raw.trim()
  if (t === '') return []
  const parts = t.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean)
  const out: number[] = []
  for (const p of parts) {
    const n = parseIntRange(p, BOOT_DISK_MIN, BOOT_DISK_MAX)
    if (n === null) return null
    out.push(n)
  }
  return out
}

function parseSecurityGroups(raw: string): string[] {
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
}

function orderedStepIds(_mode: DeploymentMode, _skip: boolean): string[] {
  return ['template', 'customization', 'review']
}

function mergeWizardDraft(base: WizardDraft, patch?: Partial<WizardDraft>): WizardDraft {
  const d = { ...INITIAL_DRAFT, ...base, ...(patch ?? {}) }
  d.templateRunStrategy = normalizeRunStrategyWire(d.templateRunStrategy?.trim()) ?? 'Always'
  return d
}

export function buildStepNav(
  ordered: string[],
  activeIndex: number,
): { id: string; label: string; status: string }[] {
  return ordered.map((id, i) => ({
    id,
    label: STEP_LABELS[id] ?? id,
    status: i < activeIndex ? 'complete' : i === activeIndex ? 'current' : 'default',
  }))
}

export function sessionPayload(session: WizardSession, sessionId: string) {
  session.draft = mergeWizardDraft(session.draft)
  const ordered = orderedStepIds(session.draft.mode, session.skipDeployment)
  const activeStepId = ordered[session.activeIndex] ?? 'review'
  return {
    sessionId,
    activeStepId,
    activeIndex: session.activeIndex,
    skipDeployment: session.skipDeployment,
    stepNav: buildStepNav(ordered, session.activeIndex),
    draft: session.draft,
  }
}

export function validateStep(
  stepId: string,
  draft: WizardDraft,
  vms: ComputeInstance[],
): Record<string, string> | null {
  const e: Record<string, string> = {}
  switch (stepId) {
    case 'deployment':
      if (!draft.mode) e.mode = 'Select a deployment method'
      break
    case 'guest-os':
      if (!draft.osFamilyNew) e.osFamilyNew = 'Select a guest OS family'
      if (!draft.osTypeNew) e.osTypeNew = 'Select a guest OS type'
      break
    case 'boot-source':
      if (!draft.bootSource) e.bootSource = 'Select a boot source'
      break
    case 'compute':
      if (!draft.cpuNew?.trim()) e.cpuNew = 'vCPU is required'
      if (!draft.memoryNew?.trim()) e.memoryNew = 'Memory is required'
      break
    case 'template':
      if (!draft.selectedTemplateId) e.selectedTemplateId = 'Select a template'
      break
    case 'clone-source': {
      if (!draft.cloneSourceVmId) e.cloneSourceVmId = 'Select a source VM'
      if (!draft.cloneNewName?.trim()) e.cloneNewName = 'Enter a name for the new VM'
      const src = vms.find((v) => v.id === draft.cloneSourceVmId)
      if (!src && draft.cloneSourceVmId) e.cloneSourceVmId = 'Source VM not found'
      if (vms.length === 0) e.cloneSourceVmId = 'No VMs available to clone'
      break
    }
    case 'customization':
      if (draft.mode === 'template') {
        if (!draft.templateVmName?.trim()) e.templateVmName = 'Virtual machine name is required'
        if (parseIntRange(draft.templateBootDiskSizeGib ?? '', BOOT_DISK_MIN, BOOT_DISK_MAX) === null)
          e.templateBootDiskSizeGib = `Boot disk size must be an integer ${BOOT_DISK_MIN}–${BOOT_DISK_MAX} GiB`
        if (parseIntRange(draft.templateCores ?? '', CORES_MIN, CORES_MAX) === null)
          e.templateCores = `vCPU must be an integer ${CORES_MIN}–${CORES_MAX}`
        if (parseIntRange(draft.templateMemoryGib ?? '', MEM_MIN, MEM_MAX) === null)
          e.templateMemoryGib = `Memory must be an integer ${MEM_MIN}–${MEM_MAX} GiB`
        if (parseAdditionalDisks(draft.templateAdditionalDisksGibRaw ?? '') === null)
          e.templateAdditionalDisksGibRaw = `Additional disks must be empty or comma-separated integers ${BOOT_DISK_MIN}–${BOOT_DISK_MAX} GiB each`
      }
      break
    case 'review':
      break
  }
  return Object.keys(e).length ? e : null
}

export function validateAllStepsBeforeReview(
  draft: WizardDraft,
  skipDeployment: boolean,
  vms: ComputeInstance[],
): Record<string, string> | null {
  const ordered = orderedStepIds(draft.mode, skipDeployment)
  for (const sid of ordered.slice(0, -1)) {
    const fe = validateStep(sid, draft, vms)
    if (fe) return fe
  }
  return null
}

export function buildVmFromDraft(draft: WizardDraft, vms: ComputeInstance[]): ComputeInstance {
  const now = Date.now()
  const id = `vm-created-${now}`
  const osMap: Record<string, OsType> = { rhel: 'rhel', linux: 'linux', windows: 'windows' }

  if (draft.mode === 'template') {
    const tpl = VM_TEMPLATES.find((t) => t.id === draft.selectedTemplateId)
    const bootGib =
      parseIntRange(draft.templateBootDiskSizeGib ?? '', BOOT_DISK_MIN, BOOT_DISK_MAX) ??
      tpl?.defaultBootDiskSizeGib ?? 40
    const cores =
      parseIntRange(draft.templateCores ?? '', CORES_MIN, CORES_MAX) ?? tpl?.defaultCores ?? 2
    const memoryGib =
      parseIntRange(draft.templateMemoryGib ?? '', MEM_MIN, MEM_MAX) ?? tpl?.defaultMemoryGib ?? 8
    const runStrategy = normalizeRunStrategyWire(draft.templateRunStrategy?.trim()) ?? 'Always'

    const spec: ComputeInstance['spec'] = {
      template: draft.selectedTemplateId ?? tpl?.id ?? '',
      cores,
      memoryGib,
      bootDisk: { size_gib: bootGib },
      runStrategy,
    }

    const userData = draft.templateUserData?.trim()
    if (userData) spec.userData = userData

    const sshKey = draft.templateSshPublicKey?.trim()
    if (sshKey) spec.sshKey = sshKey

    const subnet = draft.templateSubnetId?.trim()
    if (subnet) spec.subnet = subnet

    const sgs = parseSecurityGroups(draft.templateSecurityGroupsRaw ?? '')
    if (sgs.length) spec.securityGroups = sgs

    const extraDisks = parseAdditionalDisks(draft.templateAdditionalDisksGibRaw ?? '')
    if (extraDisks?.length) spec.additionalDisks = extraDisks.map((size_gib) => ({ size_gib }))

    const imgType = draft.templateImageSourceType?.trim()
    const imgRef = draft.templateImageSourceRef?.trim()
    if (imgType && imgRef) spec.image = { source_type: imgType, source_ref: imgRef }

    return {
      id,
      metadata: {
        name: draft.templateVmName.trim() || `${tpl?.id ?? 'vm'}-instance`,
        createdAt: new Date().toISOString(),
      },
      spec,
      status: { state: draft.startAfterCreate ? 'running' : 'stopped' },
      os: osMap[tpl?.icon ?? 'linux'] ?? 'linux',
      description: tpl?.description,
      createdAtMs: now,
    } as ComputeInstance
  }

  void vms
  throw new Error(`WIZARD_TEMPLATE_ONLY: unsupported draft.mode "${draft.mode}"`)
}

// ---------------------------------------------------------------------------
// Session factory
// ---------------------------------------------------------------------------

export type CreateSessionResult =
  | { ok: true; session: WizardSession }
  | { ok: false; error: string; status: number }

export function createSession(body: {
  entry?: string
  deploymentMethod?: DeploymentMode | null
  presetTemplateId?: string | null
  presetCloneSourceVmId?: string | null
}): CreateSessionResult {
  const entry = body.entry ?? 'dashboard'
  let draft: WizardDraft = { ...INITIAL_DRAFT }
  let skipDeployment = false

  if (entry === 'catalog' && body.presetTemplateId) {
    draft = { ...INITIAL_DRAFT, mode: 'template', selectedTemplateId: body.presetTemplateId, templateBootDiskSizeGib: '' }
    skipDeployment = true
  } else if (entry === 'clone_drawer') {
    return { ok: false, error: 'Clone wizard path is disabled until fulfillment supports it.', status: 503 }
  } else if (body.deploymentMethod) {
    return { ok: false, error: 'Non-template deployment methods are disabled until fulfillment supports them.', status: 503 }
  } else {
    draft = { ...INITIAL_DRAFT, mode: 'template', selectedTemplateId: null, templateBootDiskSizeGib: '' }
    skipDeployment = true
  }

  return { ok: true, session: { draft, skipDeployment, activeIndex: 0, entry } }
}

export function advanceSession(
  session: WizardSession,
  fromStepId: string | undefined,
  draftPatch: Partial<WizardDraft> | undefined,
): { updated: WizardSession } | { error: string; fieldErrors?: Record<string, string>; status: number } {
  const ordered = orderedStepIds(session.draft.mode, session.skipDeployment)
  const activeStepId = ordered[session.activeIndex]

  if (fromStepId && fromStepId !== activeStepId) {
    return { error: 'fromStepId mismatch', fieldErrors: { fromStepId: `Expected ${activeStepId}` }, status: 400 }
  }

  const merged = mergeWizardDraft(session.draft, draftPatch)
  session.draft = merged

  const vms = Array.from(vmStore.values())
  const errs = validateStep(activeStepId, merged, vms)
  if (errs) return { error: 'Validation failed', fieldErrors: errs, status: 400 }

  if (activeStepId === 'review') return { error: 'Use finalize on review step', status: 400 }
  if (session.activeIndex >= ordered.length - 1) return { error: 'Already at last step', status: 400 }

  session.activeIndex += 1
  return { updated: session }
}
