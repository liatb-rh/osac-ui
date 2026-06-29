// ---------------------------------------------------------------------------
// Cost estimation utilities — AI Grid PoC (capacity-based, mock rate model)
//
// All functions use provisioned-capacity metering, not usage metrics.
// Rate model mirrors the AI Grid requirement: metric = X-month.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Rate constants
// ---------------------------------------------------------------------------

export const VM_RATE = {
  /** USD per vCPU per month (= $0.05/vCPU-hour × 720 hours) */
  cpuPerCoreMonth: 36,
  /** USD per GiB RAM per month (= $0.006/GiB-hour × 720 hours) */
  memoryPerGibMonth: 4.32,
  /** USD per GiB disk per month */
  diskPerGibMonth: 0.1,
} as const

export const CLUSTER_RATE = {
  /** USD per worker node per month (flat lease, capacity-based) */
  perNodeMonth: 180,
} as const

/** Flat server lease rates by BM_FLAVORS id — capacity-based (lease whole server) */
export const BM_LEASE_RATES: Record<string, number> = {
  'bm-standard-2x': 1200,
  'bm-large-gpu': 8500,
  'bm-edge-compact': 400,
  'bm-storage-heavy': 1800,
}
const BM_FALLBACK_RATE = 900

// ---------------------------------------------------------------------------
// VM cost estimation
// ---------------------------------------------------------------------------

export interface VmCostBreakdown {
  compute: number
  storage: number
  total: number
}

export function estimateVmMonthlyCost(params: {
  cores?: number | null
  memoryGib?: number | null
  bootDiskGib?: number | null
  additionalDisksGib?: number[]
}): VmCostBreakdown | null {
  const { cores, memoryGib, bootDiskGib, additionalDisksGib = [] } = params
  if (cores == null || memoryGib == null) return null
  const compute = cores * VM_RATE.cpuPerCoreMonth + memoryGib * VM_RATE.memoryPerGibMonth
  const totalDiskGib = (bootDiskGib ?? 0) + additionalDisksGib.reduce((a, b) => a + b, 0)
  const storage = totalDiskGib * VM_RATE.diskPerGibMonth
  return { compute, storage, total: compute + storage }
}

// ---------------------------------------------------------------------------
// Cluster cost estimation
// ---------------------------------------------------------------------------

export interface ClusterCostBreakdown {
  leaseTotal: number
  nodeCount: number
}

export function estimateClusterMonthlyCost(params: {
  nodeCount: number
}): ClusterCostBreakdown {
  const { nodeCount } = params
  return {
    leaseTotal: nodeCount * CLUSTER_RATE.perNodeMonth,
    nodeCount,
  }
}

// ---------------------------------------------------------------------------
// Bare metal cost estimation
// ---------------------------------------------------------------------------

export interface BareMetalCostBreakdown {
  leaseTotal: number
  flavorId: string
}

export function estimateBareMetalMonthlyCost(params: {
  flavorId: string
}): BareMetalCostBreakdown {
  const { flavorId } = params
  const leaseTotal = BM_LEASE_RATES[flavorId] ?? BM_FALLBACK_RATE
  return { leaseTotal, flavorId }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** Format a USD monthly cost value as "~$1,200 / mo" */
export function formatCostPerMonth(usd: number): string {
  return `~$${usd.toLocaleString('en-US', { maximumFractionDigits: 0 })} / mo`
}

// ---------------------------------------------------------------------------
// Mock actuals — simulated koku-style per-VM monthly cost data
// Keyed by VM id (format: vm-<tenant>-<index padded 3>)
// Values are intentionally ~±10% from the estimate to simulate real vs estimated.
// ---------------------------------------------------------------------------

export const MOCK_VM_ACTUALS: Record<string, VmCostBreakdown> = {
  // northstar-000: ns-banking-api-01 (8 vCPU, 32 GiB, 64 GiB disk) — estimate ~$433
  'vm-northstar-000': { compute: 420.0, storage: 6.4, total: 426.4 },
  // northstar-001: ns-banking-api-02 (8 vCPU, 32 GiB, 64 GiB disk)
  'vm-northstar-001': { compute: 426.24, storage: 6.4, total: 432.64 },
  // northstar-002: ns-db-primary (16 vCPU, 64 GiB, 128 GiB disk) — estimate ~$865
  'vm-northstar-002': { compute: 852.48, storage: 12.8, total: 865.28 },
  // northstar-003: ns-db-replica-01 (16 vCPU, 64 GiB, 128 GiB disk)
  'vm-northstar-003': { compute: 843.0, storage: 12.8, total: 855.8 },
  // northstar-004: ns-devops-jenkins (4 vCPU, 16 GiB, 32 GiB disk) — estimate ~$216
  'vm-northstar-004': { compute: 213.12, storage: 3.2, total: 216.32 },
  // northstar-005: ns-compliance-scan (2 vCPU, 8 GiB, 32 GiB disk) — estimate ~$110
  'vm-northstar-005': { compute: 106.56, storage: 3.2, total: 109.76 },
}
