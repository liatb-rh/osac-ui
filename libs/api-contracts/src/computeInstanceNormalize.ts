/**
 * PROTO_JSON / fulfillment wire (snake_case + COMPUTE_INSTANCE_STATE_*) → UI ComputeInstance.
 * See docs/specs/backend-fulfillment.yaml → compute_instances_wire_format_and_ui.
 */
import type {
  ComputeInstance,
  ComputeInstanceSpec,
  ComputeInstanceStatus,
  Metadata,
  OsType,
  PageOfT,
  VmPowerState,
} from './types.js'

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

function readNum(obj: Record<string, unknown>, a: string, b?: string): number | undefined {
  for (const k of b ? [a, b] : [a]) {
    const v = obj[k]
    if (typeof v === 'number' && !Number.isNaN(v)) return v
  }
  return undefined
}

function readStr(obj: Record<string, unknown>, a: string, b?: string): string | undefined {
  for (const k of b ? [a, b] : [a]) {
    const v = obj[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
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

/**
 * Fulfillment REST `run_strategy` expects `Always` | `Halted`. Map legacy proto-style strings
 * (`RUN_STRATEGY_*`) on read; otherwise return the trimmed wire value.
 */
export function normalizeRunStrategyWire(raw: string | undefined): string | undefined {
  if (raw == null) return undefined
  const s = typeof raw === 'string' ? raw.trim() : ''
  if (!s) return undefined
  switch (s) {
    case 'RUN_STRATEGY_ALWAYS':
      return 'Always'
    case 'RUN_STRATEGY_HALTED':
      return 'Halted'
    default:
      return s
  }
}

/**
 * Map fulfillment status.state → VmPowerState (backend-fulfillment.yaml).
 * Unknown / unmappable → error (spec).
 */
export function mapFulfillmentComputeStateToVmPower(wire: string): VmPowerState {
  const s = wire.trim()
  switch (s) {
    case 'COMPUTE_INSTANCE_STATE_RUNNING':
    case 'running':
      return 'running'
    case 'COMPUTE_INSTANCE_STATE_STOPPED':
    case 'stopped':
      return 'stopped'
    case 'COMPUTE_INSTANCE_STATE_PAUSED':
    case 'paused':
      return 'paused'
    case 'COMPUTE_INSTANCE_STATE_STARTING':
    case 'starting':
      return 'starting'
    case 'COMPUTE_INSTANCE_STATE_STOPPING':
    case 'stopping':
      return 'stopping'
    case 'COMPUTE_INSTANCE_STATE_DELETING':
    case 'deleting':
      return 'deleting'
    case 'COMPUTE_INSTANCE_STATE_ERROR':
    case 'error':
      return 'error'
    default:
      return 'error'
  }
}

/** Humanize CONDITION_STATUS_* for Conditions tab (spec: True / False / Unknown). */
export function formatConditionStatusForDisplay(wireStatus: string): string {
  const u = wireStatus.toUpperCase()
  if (u.includes('TRUE') && !u.includes('FALSE')) return 'True'
  if (u.includes('FALSE')) return 'False'
  if (u === '' || u === 'UNKNOWN') return 'Unknown'
  const stripped = wireStatus.replace(/^CONDITION_STATUS_/i, '').replace(/_/g, ' ')
  return stripped ? stripped.charAt(0).toUpperCase() + stripped.slice(1).toLowerCase() : 'Unknown'
}

/**
 * vm.os if set, else heuristic from image.source_ref / template (backend-fulfillment.yaml); default linux.
 */
export function resolveVmOsForUi(vm: ComputeInstance): OsType {
  return vm.os ?? deriveGuestOsFromSpec(vm.spec) ?? 'linux'
}

/** Guest OS heuristic when proto omits vm.os — image.source_ref / template id. */
export function deriveGuestOsFromSpec(spec: ComputeInstanceSpec): OsType | undefined {
  const img = spec.image
  const template = spec.template?.toLowerCase() ?? ''

  const refRaw =
    img && typeof img === 'object'
      ? String(
          (img.source_ref as string | undefined) ?? (img.sourceRef as string | undefined) ?? '',
        ).toLowerCase()
      : ''

  const haystack = `${refRaw} ${template}`
  if (haystack.includes('windows') || haystack.includes('winserver') || haystack.includes('win-')) {
    return 'windows'
  }
  if (
    haystack.includes('rhel') ||
    haystack.includes('ubi') ||
    haystack.includes('redhat') ||
    haystack.includes('registry.redhat.io')
  ) {
    return 'rhel'
  }
  if (
    refRaw ||
    template.includes('ubuntu') ||
    template.includes('fedora') ||
    template.includes('debian') ||
    template.includes('linux')
  ) {
    return 'linux'
  }
  return undefined
}

/** Sum boot_disk.size_gib + additional_disks[].size_gib when numeric fields exist. */
export function totalStorageGiBFromSpec(spec: ComputeInstanceSpec): number | undefined {
  let sum = 0
  let any = false
  const boot = spec.bootDisk
  if (boot && typeof boot === 'object') {
    const n = readNum(boot, 'size_gib', 'sizeGib')
    if (n != null) {
      sum += n
      any = true
    }
  }
  for (const d of spec.additionalDisks ?? []) {
    if (d && typeof d === 'object') {
      const n = readNum(d, 'size_gib', 'sizeGib')
      if (n != null) {
        sum += n
        any = true
      }
    }
  }
  return any ? sum : undefined
}

export function formatVmStorageGiBLine(spec: ComputeInstanceSpec): string {
  const n = totalStorageGiBFromSpec(spec)
  if (n != null) return `${n} GiB`
  if (spec.bootDisk || spec.additionalDisks?.length) {
    const count = (spec.additionalDisks?.length ?? 0) + (spec.bootDisk ? 1 : 0)
    return `Configured (${count} disk(s))`
  }
  return 'Not specified'
}

/** Short subnet UUID for Networking (full resolve via networks API later). */
export function shortSubnetDisplay(subnet: string | undefined): string {
  if (!subnet?.trim()) return '—'
  const s = subnet.trim()
  const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
  if (uuidLike) return `${s.slice(0, 8)}…`
  return s
}

function normalizeDisk(raw: unknown): Record<string, unknown> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  return raw as Record<string, unknown>
}

function normalizeSpec(raw: Record<string, unknown>): ComputeInstanceSpec {
  const templateParameters =
    (raw.template_parameters as Record<string, unknown> | undefined) ??
    (raw.templateParameters as Record<string, unknown> | undefined)

  const imageRaw = raw.image
  const image =
    imageRaw && typeof imageRaw === 'object' && !Array.isArray(imageRaw)
      ? { ...(imageRaw as Record<string, unknown>) }
      : undefined

  const bootDisk = normalizeDisk(raw.boot_disk ?? raw.bootDisk)
  const addSrc = raw.additional_disks ?? raw.additionalDisks
  const additionalDisks = Array.isArray(addSrc)
    ? addSrc.map(normalizeDisk).filter(Boolean)
    : undefined

  return {
    template: readStr(raw, 'template'),
    templateParameters: templateParameters,
    cores: readNum(raw, 'cores'),
    memoryGib: readNum(raw, 'memory_gib', 'memoryGib'),
    image: image as ComputeInstanceSpec['image'],
    bootDisk: bootDisk,
    additionalDisks: additionalDisks as ComputeInstanceSpec['additionalDisks'],
    runStrategy: normalizeRunStrategyWire(readStr(raw, 'run_strategy', 'runStrategy')),
    sshKey: readStr(raw, 'ssh_key', 'sshKey'),
    userData: readStr(raw, 'user_data', 'userData'),
    subnet: readStr(raw, 'subnet'),
    securityGroups: readStrArr(raw, 'security_groups', 'securityGroups'),
    restartRequestedAt: readStr(raw, 'restart_requested_at', 'restartRequestedAt'),
  }
}

function normalizeConditions(raw: unknown): ComputeInstanceStatus['conditions'] {
  if (!Array.isArray(raw)) return undefined
  const out: NonNullable<ComputeInstanceStatus['conditions']> = []
  for (const c of raw) {
    const o = asRecord(c)
    const type = readStr(o, 'type')
    const status = readStr(o, 'status')
    if (!type || !status) continue
    out.push({
      type,
      status,
      reason: readStr(o, 'reason'),
      message: readStr(o, 'message'),
      lastTransitionTime: readStr(o, 'last_transition_time', 'lastTransitionTime'),
    })
  }
  return out.length ? out : undefined
}

function normalizeMetadata(raw: Record<string, unknown>): Metadata {
  const createdAt =
    readStr(raw, 'creation_timestamp', 'createdAt') ?? readStr(raw, 'created_at', 'createdAt')
  return {
    name: readStr(raw, 'name') ?? '',
    version: readNum(raw, 'version'),
    labels: readLabels(raw),
    createdAt,
    creators: readStrArr(raw, 'creators'),
    tenants: readStrArr(raw, 'tenants'),
  }
}

function normalizeStatus(raw: Record<string, unknown>): ComputeInstanceStatus {
  const stateWire = readStr(raw, 'state') ?? 'COMPUTE_INSTANCE_STATE_ERROR'
  return {
    state: mapFulfillmentComputeStateToVmPower(stateWire),
    conditions: normalizeConditions(raw.conditions),
    ipAddress: readStr(raw, 'ip_address', 'ipAddress'),
    lastRestartedAt: readStr(raw, 'last_restarted_at', 'lastRestartedAt'),
  }
}

export function normalizeComputeInstance(raw: unknown): ComputeInstance {
  const r = asRecord(raw)
  const id = readStr(r, 'id') ?? ''
  const md = normalizeMetadata(asRecord(r.metadata))
  const spec = normalizeSpec(asRecord(r.spec))
  const status = normalizeStatus(asRecord(r.status))

  const description = readStr(r, 'description')

  const osExplicit = r.os as OsType | undefined
  const osFromWire =
    osExplicit === 'rhel' || osExplicit === 'windows' || osExplicit === 'linux'
      ? osExplicit
      : undefined

  const derivedOs = deriveGuestOsFromSpec(spec)
  const os = osFromWire ?? derivedOs

  let createdAtMs: number | undefined
  if (md.createdAt) {
    const t = Date.parse(md.createdAt)
    if (!Number.isNaN(t)) createdAtMs = t
  }
  if (typeof r.createdAtMs === 'number') createdAtMs = r.createdAtMs

  return {
    id,
    metadata: md,
    spec,
    status,
    description,
    os,
    createdAtMs,
  }
}

export function normalizeComputeInstancePage(raw: unknown): PageOfT<ComputeInstance> {
  const r = asRecord(raw)
  const rawItems = r.items
  const items = Array.isArray(rawItems) ? rawItems.map(normalizeComputeInstance) : []
  const size = readNum(r, 'size') ?? items.length
  const total = readNum(r, 'total') ?? items.length
  return { size, total, items }
}

// ---------------------------------------------------------------------------
// Create POST body — fulfillment HTTP+JSON unmarshals **ComputeInstance** at the JSON root (not
// `ComputeInstancesCreateRequest { object }`; that wrapper rejects with unknown field "object").
// Use `serializeComputeInstanceForCreate` for POST. `serializeComputeInstancesCreateRequest` is only
// for parity with the RPC message shape if a different binding appears later.
// ---------------------------------------------------------------------------

/** UI VmPowerState → fulfillment `status.state` enum string. */
export function vmPowerStateToProtoEnum(state: VmPowerState | undefined): string | undefined {
  if (!state || state === 'creating' || state === 'still_provisioning') return undefined
  const m: Record<Exclude<VmPowerState, 'creating' | 'still_provisioning'>, string> = {
    running: 'COMPUTE_INSTANCE_STATE_RUNNING',
    stopped: 'COMPUTE_INSTANCE_STATE_STOPPED',
    paused: 'COMPUTE_INSTANCE_STATE_PAUSED',
    starting: 'COMPUTE_INSTANCE_STATE_STARTING',
    stopping: 'COMPUTE_INSTANCE_STATE_STOPPING',
    restarting: 'COMPUTE_INSTANCE_STATE_STARTING',
    deleting: 'COMPUTE_INSTANCE_STATE_DELETING',
    error: 'COMPUTE_INSTANCE_STATE_ERROR',
  }
  return m[state]
}

export type ComputeInstancePowerAction = 'start' | 'stop' | 'restart'

/**
 * PATCH body for Start / Stop / Restart on `PATCH …/compute_instances/{id}` (backend-fulfillment.yaml).
 */
export function serializeComputeInstancePowerPatch(
  action: ComputeInstancePowerAction,
): Record<string, unknown> {
  switch (action) {
    case 'stop':
      return {
        spec: { run_strategy: 'Halted' },
        status: { state: 'COMPUTE_INSTANCE_STATE_STOPPED' },
      }
    case 'start':
      return {
        spec: { run_strategy: 'Always' },
        status: { state: 'COMPUTE_INSTANCE_STATE_RUNNING' },
      }
    case 'restart':
      return {
        spec: { restart_requested_at: new Date().toISOString() },
      }
  }
}

function serializeMetadataForCreate(md: Metadata | undefined): Record<string, unknown> | undefined {
  if (!md) return undefined
  const o: Record<string, unknown> = {}
  if (md.name) o.name = md.name
  if (md.version != null) o.version = md.version
  if (md.createdAt) o.creation_timestamp = md.createdAt
  if (md.creators?.length) o.creators = md.creators
  if (md.tenants?.length) o.tenants = md.tenants
  if (md.labels && Object.keys(md.labels).length) o.labels = md.labels
  return Object.keys(o).length ? o : undefined
}

function serializeDiskWire(
  d: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!d || typeof d !== 'object') return undefined
  const n = readNum(d, 'size_gib', 'sizeGib')
  if (n == null) return undefined
  return { size_gib: n }
}

function serializeImageWire(
  img: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!img || typeof img !== 'object') return undefined
  const o: Record<string, unknown> = {}
  const st = readStr(img, 'source_type', 'sourceType')
  const sr = readStr(img, 'source_ref', 'sourceRef')
  if (st) o.source_type = st
  if (sr) o.source_ref = sr
  return Object.keys(o).length ? o : undefined
}

// ---------------------------------------------------------------------------
// template_parameters — ProtoJSON google.protobuf.Any (map<string, Any>)
// ---------------------------------------------------------------------------

const TYPE_INT32 = 'type.googleapis.com/google.protobuf.Int32Value'
const TYPE_INT64 = 'type.googleapis.com/google.protobuf.Int64Value'
const TYPE_DOUBLE = 'type.googleapis.com/google.protobuf.DoubleValue'
const TYPE_BOOL = 'type.googleapis.com/google.protobuf.BoolValue'
const TYPE_STRING = 'type.googleapis.com/google.protobuf.StringValue'

/** ProtoJSON wrapper for a 32-bit integer template parameter. */
export function protoJsonAnyInt32(value: number): { '@type': string; value: number } {
  return { '@type': TYPE_INT32, value }
}

/** ProtoJSON wrapper for a 64-bit integer (`value` as decimal string per proto JSON). */
export function protoJsonAnyInt64(value: string | number): { '@type': string; value: string } {
  return { '@type': TYPE_INT64, value: typeof value === 'number' ? String(value) : value }
}

export function protoJsonAnyDouble(value: number): { '@type': string; value: number } {
  return { '@type': TYPE_DOUBLE, value }
}

export function protoJsonAnyBool(value: boolean): { '@type': string; value: boolean } {
  return { '@type': TYPE_BOOL, value }
}

export function protoJsonAnyString(value: string): { '@type': string; value: string } {
  return { '@type': TYPE_STRING, value }
}

function wrapTemplateParameterAnyValue(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const o = value as Record<string, unknown>
    if (typeof o['@type'] === 'string') return { ...o }
  }
  if (typeof value === 'boolean') return protoJsonAnyBool(value)
  if (typeof value === 'string') return protoJsonAnyString(value)
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (Number.isInteger(value) && value >= -2147483648 && value <= 2147483647) {
      return protoJsonAnyInt32(value)
    }
    if (Number.isInteger(value)) {
      return protoJsonAnyInt64(value)
    }
    return protoJsonAnyDouble(value)
  }
  throw new Error(
    `template_parameters values must be ProtoJSON Any-shaped objects or boolean/number/string; got ${typeof value}`,
  )
}

/** Maps `spec.templateParameters` to wire `template_parameters` with ProtoJSON Any for plain scalars. */
export function serializeTemplateParametersWire(
  tp: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!tp || typeof tp !== 'object') return undefined
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(tp)) {
    if (v === undefined || v === null) continue
    out[k] = wrapTemplateParameterAnyValue(v)
  }
  return Object.keys(out).length ? out : undefined
}

function appendComputeInstanceSpecOptionalWire(
  spec: ComputeInstanceSpec,
  o: Record<string, unknown>,
): void {
  if (spec.cores != null) o.cores = spec.cores
  if (spec.memoryGib != null) o.memory_gib = spec.memoryGib
  const img = serializeImageWire(spec.image)
  if (img) o.image = img
  const boot = serializeDiskWire(spec.bootDisk)
  if (boot) o.boot_disk = boot
  if (spec.additionalDisks?.length) {
    const disks = spec.additionalDisks
      .map((d) => serializeDiskWire(d))
      .filter((x): x is Record<string, unknown> => Boolean(x))
    if (disks.length) o.additional_disks = disks
  }
  if (spec.runStrategy) o.run_strategy = spec.runStrategy
  if (spec.userData) o.user_data = spec.userData
  if (spec.sshKey) o.ssh_key = spec.sshKey
  if (spec.subnet) o.subnet = spec.subnet
  if (spec.securityGroups?.length) o.security_groups = [...spec.securityGroups]
  if (spec.restartRequestedAt) o.restart_requested_at = spec.restartRequestedAt
}

function serializeSpecForCreate(
  spec: ComputeInstanceSpec | undefined,
  opts?: { templateOnly?: boolean },
): Record<string, unknown> | undefined {
  if (!spec) return undefined
  if (opts?.templateOnly && !spec.template) return undefined

  const o: Record<string, unknown> = {}
  if (spec.template) o.template = spec.template
  const tpWire = serializeTemplateParametersWire(spec.templateParameters)
  if (tpWire) o.template_parameters = tpWire
  appendComputeInstanceSpecOptionalWire(spec, o)

  return Object.keys(o).length ? o : undefined
}

export interface SerializeComputeInstanceForCreateOptions {
  /**
   * When true (template wizard create), **`spec.template` is required**; other fields on `spec` are
   * still serialized when set, per `ComputeInstanceSpec` (e.g. `boot_disk`, `cores`, `template_parameters` Any map).
   */
  specTemplateOnly?: boolean
}

/**
 * Builds JSON body for `POST …/compute_instances`: **ComputeInstance** at the root, with snake_case /
 * proto-style field names. Omits UI-only fields (`description`, `os`, `createdAtMs`).
 */
export function serializeComputeInstanceForCreate(
  vm: Partial<ComputeInstance>,
  opts?: SerializeComputeInstanceForCreateOptions,
): Record<string, unknown> {
  const wire: Record<string, unknown> = {}
  if (vm.id) wire.id = vm.id
  const md = serializeMetadataForCreate(vm.metadata)
  if (md) wire.metadata = md
  const sp = serializeSpecForCreate(
    vm.spec,
    opts?.specTemplateOnly ? { templateOnly: true } : undefined,
  )
  if (sp) wire.spec = sp
  if (vm.status?.state) {
    const stateWire = vmPowerStateToProtoEnum(vm.status.state)
    if (stateWire) wire.status = { state: stateWire }
  }
  return wire
}

/**
 * RPC-style **ComputeInstancesCreateRequest** `{ "object": … }`. Do **not** use for the current
 * fulfillment HTTP create endpoint (gateway returns unknown field `"object"`).
 */
export function serializeComputeInstancesCreateRequest(
  vm: Partial<ComputeInstance>,
  opts?: SerializeComputeInstanceForCreateOptions,
): { object: Record<string, unknown> } {
  return { object: serializeComputeInstanceForCreate(vm, opts) }
}
