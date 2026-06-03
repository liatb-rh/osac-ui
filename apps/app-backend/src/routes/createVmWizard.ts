/**
 * BFF create-vm-wizard session API — mock orchestration per docs/specs/backend-fulfillment.yaml
 * (bff_demo_osac_extensions.create_virtual_machine_wizard).
 *
 * WIZARD_TEMPLATE_ONLY (2026): sessions are **template-only** (see `orderedStepIds`, session POST handler,
 * and `buildVmFromDraft`). Clone / scratch paths are commented with RESTORE markers.
 * Step ids and validation: docs/specs/ui-flows/create-virtual-machine-wizard.yaml (canonical_bff_step_ids, step_worksheets).
 */
import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import {
  type ComputeInstance,
  type OsType,
  VM_TEMPLATES,
  normalizeRunStrategyWire,
} from '@osac/api-contracts'
import { vmStore } from '../mock-vm-store.js'

const prefix = '/api/osac/bff/v1/create-vm-wizard'

type DeploymentMode = 'new' | 'template' | 'clone'

const TEMPLATE_BOOT_DISK_MIN_GIB = 1
const TEMPLATE_BOOT_DISK_MAX_GIB = 512
const TEMPLATE_CORES_MIN = 1
const TEMPLATE_CORES_MAX = 128
const TEMPLATE_MEMORY_GIB_MIN = 1
const TEMPLATE_MEMORY_GIB_MAX = 512

function parseTemplateBootDiskGibInput(raw: string): number | null {
  const t = raw.trim()
  if (!/^\d+$/.test(t)) return null
  const n = Number(t)
  if (n < TEMPLATE_BOOT_DISK_MIN_GIB || n > TEMPLATE_BOOT_DISK_MAX_GIB) return null
  return n
}

function parseTemplateCoresInput(raw: string): number | null {
  const t = raw.trim()
  if (!/^\d+$/.test(t)) return null
  const n = Number(t)
  if (n < TEMPLATE_CORES_MIN || n > TEMPLATE_CORES_MAX) return null
  return n
}

function parseTemplateMemoryGibInput(raw: string): number | null {
  const t = raw.trim()
  if (!/^\d+$/.test(t)) return null
  const n = Number(t)
  if (n < TEMPLATE_MEMORY_GIB_MIN || n > TEMPLATE_MEMORY_GIB_MAX) return null
  return n
}

function parseTemplateAdditionalDisksGibInput(raw: string): number[] | null {
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

function parseTemplateSecurityGroupsInput(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

type WizardDraft = {
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

const INITIAL_DRAFT: WizardDraft = {
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

function mergeWizardDraft(base: WizardDraft, patch?: Partial<WizardDraft>): WizardDraft {
  const d = { ...INITIAL_DRAFT, ...base, ...(patch ?? {}) }
  d.templateRunStrategy = normalizeRunStrategyWire(d.templateRunStrategy?.trim()) ?? 'Always'
  return d
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

function orderedStepIds(_mode: DeploymentMode, _skipDeployment: boolean): string[] {
  return ['template', 'customization', 'review']
}

/*
RESTORE when fulfillment supports new + clone (keep in sync with frontend stepIds.ts):
function orderedStepIds(mode: DeploymentMode, skipDeployment: boolean): string[] {
  if (skipDeployment && mode === 'template') return ['template', 'customization', 'review']
  if (skipDeployment && mode === 'clone') return ['clone-source', 'review']
  if (mode === 'new')
    return ['deployment', 'guest-os', 'boot-source', 'compute', 'customization', 'review']
  if (mode === 'template') return ['deployment', 'template', 'customization', 'review']
  return ['deployment', 'clone-source', 'review']
}
*/

interface WizardSession {
  draft: WizardDraft
  skipDeployment: boolean
  activeIndex: number
  entry: string
}

const sessions = new Map<string, WizardSession>()

function buildStepNav(
  ordered: string[],
  activeIndex: number,
): { id: string; label: string; status: string }[] {
  return ordered.map((id, i) => ({
    id,
    label: STEP_LABELS[id] ?? id,
    status: i < activeIndex ? 'complete' : i === activeIndex ? 'current' : 'default',
  }))
}

function sessionPayload(session: WizardSession, sessionId: string) {
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

function validateStep(
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
        if (!draft.templateVmName?.trim()) {
          e.templateVmName = 'Virtual machine name is required'
        }
        if (parseTemplateBootDiskGibInput(draft.templateBootDiskSizeGib ?? '') === null) {
          e.templateBootDiskSizeGib = `Boot disk size must be an integer ${TEMPLATE_BOOT_DISK_MIN_GIB}–${TEMPLATE_BOOT_DISK_MAX_GIB} GiB`
        }
        if (parseTemplateCoresInput(draft.templateCores ?? '') === null) {
          e.templateCores = `vCPU must be an integer ${TEMPLATE_CORES_MIN}–${TEMPLATE_CORES_MAX}`
        }
        if (parseTemplateMemoryGibInput(draft.templateMemoryGib ?? '') === null) {
          e.templateMemoryGib = `Memory must be an integer ${TEMPLATE_MEMORY_GIB_MIN}–${TEMPLATE_MEMORY_GIB_MAX} GiB`
        }
        if (
          parseTemplateAdditionalDisksGibInput(draft.templateAdditionalDisksGibRaw ?? '') === null
        ) {
          e.templateAdditionalDisksGibRaw = `Additional disks must be empty or comma-separated integers ${TEMPLATE_BOOT_DISK_MIN_GIB}–${TEMPLATE_BOOT_DISK_MAX_GIB} GiB each`
        }
      }
      break
    case 'review':
      break
    default:
      break
  }
  return Object.keys(e).length ? e : null
}

function validateAllStepsBeforeReview(
  draft: WizardDraft,
  skipDeployment: boolean,
  vms: ComputeInstance[],
) {
  const ordered = orderedStepIds(draft.mode, skipDeployment)
  for (const sid of ordered.slice(0, -1)) {
    const fe = validateStep(sid, draft, vms)
    if (fe) return fe
  }
  return null
}

function buildVmFromDraft(draft: WizardDraft, vms: ComputeInstance[]): ComputeInstance {
  const now = Date.now()
  const id = `vm-created-${now}`
  const osMap: Record<string, OsType> = { rhel: 'rhel', linux: 'linux', windows: 'windows' }

  /*
  RESTORE clone path when fulfillment supports it:
  if (draft.mode === 'clone') {
    const src = vms.find((v) => v.id === draft.cloneSourceVmId)
    return {
      ...(src ?? {}),
      id,
      metadata: {
        name: draft.cloneNewName.trim() || `${src?.metadata.name ?? 'vm'}-clone`,
        createdAt: new Date().toISOString(),
      },
      status: { state: 'stopped' },
      description: src ? `Cloned from ${src.metadata.name}.` : 'Cloned VM.',
      createdAtMs: now,
    } as ComputeInstance
  }
  */

  if (draft.mode === 'template') {
    const tpl = VM_TEMPLATES.find((t) => t.id === draft.selectedTemplateId)
    const bootGib =
      parseTemplateBootDiskGibInput(draft.templateBootDiskSizeGib ?? '') ??
      tpl?.defaultBootDiskSizeGib ??
      40
    const cores = parseTemplateCoresInput(draft.templateCores ?? '') ?? tpl?.defaultCores ?? 2
    const memoryGib =
      parseTemplateMemoryGibInput(draft.templateMemoryGib ?? '') ?? tpl?.defaultMemoryGib ?? 8
    const runStrategy = normalizeRunStrategyWire(draft.templateRunStrategy?.trim()) ?? 'Always'
    const templateId = draft.selectedTemplateId ?? tpl?.id ?? ''

    const spec: ComputeInstance['spec'] = {
      template: templateId,
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

    const securityGroups = parseTemplateSecurityGroupsInput(draft.templateSecurityGroupsRaw ?? '')
    if (securityGroups.length) spec.securityGroups = securityGroups

    const extraDisks = parseTemplateAdditionalDisksGibInput(
      draft.templateAdditionalDisksGibRaw ?? '',
    )
    if (extraDisks?.length) {
      spec.additionalDisks = extraDisks.map((size_gib) => ({ size_gib }))
    }

    const imgType = draft.templateImageSourceType?.trim()
    const imgRef = draft.templateImageSourceRef?.trim()
    if (imgType && imgRef) {
      spec.image = { source_type: imgType, source_ref: imgRef }
    }

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

  /*
  RESTORE "new VM from scratch" path when fulfillment supports it:
  const userData = draft.cloudInitUserDataNew?.trim()
  return {
    id,
    metadata: {
      name: `vm-${id.slice(-6)}`,
      createdAt: new Date().toISOString(),
    },
    spec: {
      cores: parseInt(draft.cpuNew, 10) || 2,
      memoryGib: parseInt(draft.memoryNew, 10) || 4,
      ...(userData ? { userData } : {}),
    },
    status: { state: draft.startAfterCreate ? 'running' : 'stopped' },
    os: osMap[draft.osFamilyNew] ?? 'linux',
    createdAtMs: now,
  } as ComputeInstance
  */

  void vms
  throw new Error(
    `WIZARD_TEMPLATE_ONLY: unsupported draft.mode ${draft.mode} (only template is active)`,
  )
}

export async function registerCreateVmWizardRoutes(app: FastifyInstance) {
  app.post(`${prefix}/sessions`, async (req, reply) => {
    const body = (req.body ?? {}) as {
      entry?: string
      deploymentMethod?: DeploymentMode | null
      presetTemplateId?: string | null
      presetCloneSourceVmId?: string | null
    }
    const entry = body.entry ?? 'dashboard'
    const sessionId = `wzd-${randomUUID()}`

    let draft: WizardDraft = { ...INITIAL_DRAFT }
    let skipDeployment = false
    let activeIndex = 0

    if (entry === 'catalog' && body.presetTemplateId) {
      draft = {
        ...INITIAL_DRAFT,
        mode: 'template',
        selectedTemplateId: body.presetTemplateId,
        /** UI seeds from fulfillment-backed `compute_instance_templates` (spec_defaults.boot_disk); mock VM_TEMPLATES ids may not match upstream. */
        templateBootDiskSizeGib: '',
      }
      skipDeployment = true
      activeIndex = 0
    } else if (entry === 'clone_drawer') {
      return reply.status(503).send({
        error: 'Clone wizard path is disabled until fulfillment supports it.',
      })
    } else if (body.deploymentMethod) {
      /*
    RESTORE clone_drawer session bootstrap:
    else if (entry === 'clone_drawer' && body.presetCloneSourceVmId) {
      const src = Array.from(vmStore.values()).find((v) => v.id === body.presetCloneSourceVmId)
      draft = {
        ...INITIAL_DRAFT,
        mode: 'clone',
        cloneSourceVmId: body.presetCloneSourceVmId,
        cloneNewName: src ? `${src.metadata.name}-clone` : '',
      }
      skipDeployment = true
      activeIndex = 0
    }
    */
      return reply.status(503).send({
        error: 'Non-template deployment methods are disabled until fulfillment supports them.',
      })
    } else {
      /*
    RESTORE deploymentMethod branch:
    else if (body.deploymentMethod) {
      draft = { ...INITIAL_DRAFT, mode: body.deploymentMethod }
    }
    */
      draft = {
        ...INITIAL_DRAFT,
        mode: 'template',
        selectedTemplateId: null,
        templateBootDiskSizeGib: '',
      }
      skipDeployment = true
      activeIndex = 0
    }

    const session: WizardSession = { draft, skipDeployment, activeIndex, entry }
    sessions.set(sessionId, session)
    return reply.send(sessionPayload(session, sessionId))
  })

  app.get(`${prefix}/sessions/:sessionId`, async (req, reply) => {
    const { sessionId } = req.params as { sessionId: string }
    const session = sessions.get(sessionId)
    if (!session) return reply.status(404).send({ error: 'Session not found' })
    return reply.send(sessionPayload(session, sessionId))
  })

  app.post(`${prefix}/sessions/:sessionId/advance`, async (req, reply) => {
    const { sessionId } = req.params as { sessionId: string }
    const session = sessions.get(sessionId)
    if (!session) return reply.status(404).send({ error: 'Session not found' })

    const body = (req.body ?? {}) as { fromStepId?: string; draft?: Partial<WizardDraft> }
    const ordered = orderedStepIds(session.draft.mode, session.skipDeployment)
    const activeStepId = ordered[session.activeIndex]
    if (body.fromStepId && body.fromStepId !== activeStepId) {
      return reply.status(400).send({
        error: 'fromStepId mismatch',
        fieldErrors: { fromStepId: `Expected ${activeStepId}` },
      })
    }

    const merged = mergeWizardDraft(session.draft, body.draft)
    session.draft = merged

    const vms = Array.from(vmStore.values())
    const errs = validateStep(activeStepId, merged, vms)
    if (errs) return reply.status(400).send({ fieldErrors: errs })

    if (activeStepId === 'review') {
      return reply.status(400).send({ error: 'Use finalize on review step' })
    }

    if (session.activeIndex >= ordered.length - 1) {
      return reply.status(400).send({ error: 'Already at last step' })
    }

    session.activeIndex += 1
    return reply.send(sessionPayload(session, sessionId))
  })

  app.post(`${prefix}/sessions/:sessionId/back`, async (req, reply) => {
    const { sessionId } = req.params as { sessionId: string }
    const session = sessions.get(sessionId)
    if (!session) return reply.status(404).send({ error: 'Session not found' })
    if (session.activeIndex <= 0) {
      return reply.status(400).send({ error: 'Cannot go back from first step' })
    }
    session.activeIndex -= 1
    return reply.send(sessionPayload(session, sessionId))
  })

  app.post(`${prefix}/sessions/:sessionId/finalize`, async (req, reply) => {
    const { sessionId } = req.params as { sessionId: string }
    const session = sessions.get(sessionId)
    if (!session) return reply.status(404).send({ error: 'Session not found' })

    const ordered = orderedStepIds(session.draft.mode, session.skipDeployment)
    const activeStepId = ordered[session.activeIndex]
    if (activeStepId !== 'review') {
      return reply.status(400).send({ error: 'Finalize only allowed on review step' })
    }

    const body = (req.body ?? {}) as { draft?: Partial<WizardDraft> }
    session.draft = mergeWizardDraft(session.draft, body.draft)

    const vms = Array.from(vmStore.values())
    const errs = validateAllStepsBeforeReview(session.draft, session.skipDeployment, vms)
    if (errs) return reply.status(400).send({ fieldErrors: errs })

    const vm = buildVmFromDraft(session.draft, vms)
    const persisted: ComputeInstance = {
      ...vm,
      id: vm.id ?? `vm-created-${Date.now()}`,
      status: vm.status ?? { state: 'starting' },
      metadata: { ...vm.metadata, createdAt: new Date().toISOString() },
    }
    vmStore.set(persisted.id, persisted)
    sessions.delete(sessionId)
    return reply.send({ object: persisted })
  })

  app.delete(`${prefix}/sessions/:sessionId`, async (req, reply) => {
    const { sessionId } = req.params as { sessionId: string }
    sessions.delete(sessionId)
    return reply.status(204).send()
  })
}
