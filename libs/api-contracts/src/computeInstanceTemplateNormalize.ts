/**
 * Fulfillment wire (PROTO_JSON / snake_case) → UI ClusterTemplate for compute_instance_templates.
 */
import type { ClusterTemplate, Metadata, PageOfT, TemplateWorkloadProfile } from './types.js'

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

function readStr(obj: Record<string, unknown>, a: string, b?: string): string | undefined {
  for (const k of b ? [a, b] : [a]) {
    const v = obj[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return undefined
}

function readNum(obj: Record<string, unknown>, a: string, b?: string): number | undefined {
  for (const k of b ? [a, b] : [a]) {
    const v = obj[k]
    if (typeof v === 'number' && !Number.isNaN(v)) return v
  }
  return undefined
}

function readStrArr(obj: Record<string, unknown>, a: string, b?: string): string[] | undefined {
  for (const k of b ? [a, b] : [a]) {
    const v = obj[k]
    if (Array.isArray(v) && v.every((x) => typeof x === 'string')) return v
  }
  return undefined
}

function readLabels(obj: Record<string, unknown>): Record<string, string> | undefined {
  const raw = obj.labels
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'string') out[k] = v
  }
  return Object.keys(out).length ? out : undefined
}

function mapWorkloadProfile(v: unknown): TemplateWorkloadProfile | undefined {
  if (typeof v !== 'string') return undefined
  const s = v
    .trim()
    .toLowerCase()
    .replace(/^template_workload_profile_/i, '')
    .replace(/-/g, '_')
  if (s === 'high_performance' || s === 'highperformance') return 'high-performance'
  if (s === 'machine_learning' || s === 'machinelearning') return 'machine-learning'
  if (s === 'data_processing' || s === 'dataprocessing') return 'data-processing'
  if (s === 'analytics') return 'analytics'
  return undefined
}

function normalizeMetadata(raw: Record<string, unknown>, fallbackName: string): Metadata {
  const name = String(readStr(raw, 'name') ?? fallbackName)
  return {
    name,
    version: readNum(raw, 'version'),
    labels: readLabels(raw),
    createdAt: readStr(raw, 'creation_timestamp', 'createdAt'),
    creators: readStrArr(raw, 'creators'),
    tenants: readStrArr(raw, 'tenants'),
  }
}

export function normalizeComputeInstanceTemplate(raw: unknown): ClusterTemplate {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid compute_instance_template payload')
  const r = raw as Record<string, unknown>
  const mdIn = asRecord(r.metadata)
  const id = String((r.id ?? mdIn.name ?? '') as string)
  const title = String((r.title ?? readStr(r, 'display_name') ?? mdIn.name ?? id) as string)

  const spec = r.spec
  const status = r.status
  const tags = readStrArr(r, 'tags')

  const workloadProfile =
    mapWorkloadProfile(r.workload_profile) ?? mapWorkloadProfile(r.workloadProfile) ?? undefined

  const iconRaw = readStr(r, 'icon') ?? readStr(r, 'guest_os') ?? readStr(r, 'guest_os_family')

  /** Fulfillment list/detail often nests VM defaults under `spec_defaults` (alias: specDefaults). */
  const defaults = asRecord(r.defaults)
  const specDefaults = asRecord(r.spec_defaults ?? r.specDefaults)

  function readBootDiskSizeGibFrom(record: Record<string, unknown>): number | undefined {
    const bd = asRecord(record.boot_disk ?? record.bootDisk)
    return readNum(bd, 'size_gib', 'sizeGib')
  }

  const defaultBootDiskSizeGib =
    readBootDiskSizeGibFrom(defaults) ??
    readBootDiskSizeGibFrom(specDefaults) ??
    readNum(r, 'default_boot_disk_size_gib', 'defaultBootDiskSizeGib')

  const defaultCores = readNum(r, 'default_cores', 'defaultCores') ?? readNum(specDefaults, 'cores')
  const defaultMemoryGib =
    readNum(r, 'default_memory_gib', 'defaultMemoryGib') ??
    readNum(specDefaults, 'memory_gib', 'memoryGib')

  return {
    id,
    title,
    description: readStr(r, 'description'),
    metadata: normalizeMetadata(mdIn, id),
    spec:
      spec && typeof spec === 'object' && !Array.isArray(spec)
        ? (spec as Record<string, unknown>)
        : undefined,
    status:
      status && typeof status === 'object' && !Array.isArray(status)
        ? (status as Record<string, unknown>)
        : undefined,
    workload: readStr(r, 'workload'),
    workloadProfile,
    defaultCores,
    defaultMemoryGib,
    defaultBootDiskSizeGib,
    tags,
    icon: iconRaw,
  }
}

export function normalizeComputeInstanceTemplatePage(raw: unknown): PageOfT<ClusterTemplate> {
  const r = asRecord(raw)
  const itemsRaw = r.items
  if (!Array.isArray(itemsRaw))
    throw new Error('compute_instance_templates page: missing items array')
  const items = itemsRaw.map(normalizeComputeInstanceTemplate)
  const size = typeof r.size === 'number' ? r.size : items.length
  const total = typeof r.total === 'number' ? r.total : items.length
  return { size, total, items }
}
