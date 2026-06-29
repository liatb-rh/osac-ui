/**
 * Shared mock catalog items store.
 * TenantAdmin publishes items here; CatalogItemsPage reads them.
 * No backend — pure client-side state for demo/mock mode.
 */
import type { FullCatalogItem } from '@osac/ui-components'

// Seed with a few published items so the tenant user catalog is not empty.
const SEED_ITEMS: FullCatalogItem[] = [
  {
    id: 'ci-rhel9-s',
    metadata: { name: 'rhel9-small' },
    title: 'RHEL 9 — Small',
    description: 'Compact RHEL 9 VM for lightweight workloads.',
    type: 'vm',
    published: true,
    tenantEnabled: true,
    templateRef: 'vm-rhel9',
    // 2 vCPU × $36 + 8 GiB × $4.32 + 40 GiB × $0.10 = $110.56
    fixedDefaults: { cpu: 2, memoryGib: 8, bootDiskSizeGib: 40, estimatedMonthlyCostUsd: 111 },
    tags: ['rhel', 'small'],
  },
  {
    id: 'ci-rhel9-m',
    metadata: { name: 'rhel9-medium' },
    title: 'RHEL 9 — Medium',
    description: 'Mid-size RHEL 9 VM suitable for web services.',
    type: 'vm',
    published: true,
    tenantEnabled: true,
    templateRef: 'vm-rhel9',
    // 4 vCPU × $36 + 16 GiB × $4.32 + 80 GiB × $0.10 = $221.12
    fixedDefaults: { cpu: 4, memoryGib: 16, bootDiskSizeGib: 80, estimatedMonthlyCostUsd: 221 },
    tags: ['rhel', 'medium'],
  },
  {
    id: 'ci-ocp-edge',
    metadata: { name: 'ocp-edge' },
    title: 'OpenShift 4.17 — Edge',
    description: 'Lightweight 3-node edge OpenShift cluster.',
    type: 'cluster',
    published: true,
    tenantEnabled: true,
    templateRef: 'ocp-4.17-edge',
    // 3 nodes × $180/node-month = $540
    fixedDefaults: { cpu: 3, memoryGib: 24, ocpVersion: '4.17', estimatedMonthlyCostUsd: 540 },
    tags: ['openshift', 'edge'],
  },

  // ---------------------------------------------------------------------------
  // Bare metal catalog items — exercises all FieldComponentType variants
  // ---------------------------------------------------------------------------

  {
    id: 'ci-bm-standard',
    metadata: { name: 'bm-standard-2x' },
    title: 'Standard 2× AMD EPYC',
    description:
      'Dual-socket AMD EPYC 7452, 256 GiB RAM, 2× 1.92 TB SSD. General-purpose bare metal for web services and databases.',
    type: 'baremetal',
    published: true,
    tenantEnabled: true,
    templateRef: 'bm-standard-2x',
    // flat server lease — bm-standard-2x → $1,200/mo
    fixedDefaults: { estimatedMonthlyCostUsd: 1200 },
    tags: ['amd', 'general-purpose'],
    fieldDefinitions: [
      // text — editable: user names the OS hostname
      {
        id: 'fd-hostname',
        path: 'spec.hostname',
        displayName: 'OS Hostname',
        componentType: 'text',
        editable: true,
        defaultValue: '',
        validation: { minLength: 1, maxLength: 63, pattern: '^[a-z0-9-]+$' },
      },
      // number — editable: vCPU pinning count (maps EC2 instance type CPU selection)
      {
        id: 'fd-cpu-pin',
        path: 'spec.cpuPinCount',
        displayName: 'CPU Pin Count',
        componentType: 'number',
        editable: true,
        defaultValue: 4,
        validation: { min: 1, max: 32, step: 1 },
      },
      // select — editable: CPU governor (maps EC2 performance vs power-save)
      {
        id: 'fd-governor',
        path: 'spec.cpuGovernor',
        displayName: 'CPU Governor',
        componentType: 'select',
        editable: true,
        defaultValue: 'performance',
        options: ['performance', 'powersave', 'ondemand', 'conservative'],
      },
      // boolean — editable: NUMA topology awareness
      {
        id: 'fd-numa',
        path: 'spec.numaAware',
        displayName: 'NUMA Topology Aware',
        componentType: 'boolean',
        editable: true,
        defaultValue: true,
      },
      // text — locked: zone is fixed by this catalog item (maps EC2 AZ locked by template)
      {
        id: 'fd-zone',
        path: 'spec.zone',
        displayName: 'Failure Domain',
        componentType: 'text',
        editable: false,
        defaultValue: 'zone-a',
      },
    ],
  },

  {
    id: 'ci-bm-gpu',
    metadata: { name: 'bm-large-gpu' },
    title: 'GPU Accelerated (A100)',
    description:
      'Intel Xeon Gold 6348, 512 GiB RAM, 2× NVIDIA A100 80 GB. For ML training, inference, and HPC workloads.',
    type: 'baremetal',
    published: true,
    tenantEnabled: true,
    templateRef: 'bm-large-gpu',
    // flat server lease — bm-large-gpu → $8,500/mo
    fixedDefaults: { estimatedMonthlyCostUsd: 8500 },
    tags: ['gpu', 'ml', 'hpc'],
    fieldDefinitions: [
      // text — editable
      {
        id: 'fd-hostname-gpu',
        path: 'spec.hostname',
        displayName: 'OS Hostname',
        componentType: 'text',
        editable: true,
        defaultValue: '',
      },
      // select — editable: GPU driver version (maps EC2 AMI selection)
      {
        id: 'fd-driver',
        path: 'spec.gpuDriverVersion',
        displayName: 'GPU Driver Version',
        componentType: 'select',
        editable: true,
        defaultValue: '535.154.05',
        options: ['535.154.05', '545.23.08', '550.54.15'],
      },
      // number — editable: MIG partitions (NVIDIA Multi-Instance GPU)
      {
        id: 'fd-mig',
        path: 'spec.migPartitions',
        displayName: 'MIG Partitions',
        componentType: 'number',
        editable: true,
        defaultValue: 1,
        validation: { min: 1, max: 7, step: 1 },
      },
      // boolean — editable: ECC memory (maps reliability vs performance trade-off)
      {
        id: 'fd-ecc',
        path: 'spec.eccEnabled',
        displayName: 'ECC Memory Enabled',
        componentType: 'boolean',
        editable: true,
        defaultValue: true,
      },
      // textarea — editable: extra cloud-init snippet (maps EC2 User Data extension)
      {
        id: 'fd-cloud-init',
        path: 'spec.extraCloudInit',
        displayName: 'Extra cloud-init Snippet',
        componentType: 'textarea',
        editable: true,
        defaultValue: '',
        validation: { maxLength: 4096, rows: 5 },
      },
      // password — locked: GPU telemetry token injected by admin (not user-visible)
      {
        id: 'fd-telemetry',
        path: 'spec.telemetryToken',
        displayName: 'Telemetry Token',
        componentType: 'password',
        editable: false,
        defaultValue: '••••••••',
      },
      // text — locked: network policy group (maps EC2 Security Group — locked by template)
      {
        id: 'fd-sgp',
        path: 'spec.networkPolicyGroup',
        displayName: 'Network Policy Group',
        componentType: 'text',
        editable: false,
        defaultValue: 'gpu-workload-sg',
      },
    ],
  },

  {
    id: 'ci-bm-edge',
    metadata: { name: 'bm-edge-compact' },
    title: 'Edge Compact',
    description:
      'Intel Atom C3758, 64 GiB RAM, 1× 480 GB SSD. Lightweight bare metal for edge and IoT gateway workloads.',
    type: 'baremetal',
    published: true,
    tenantEnabled: true,
    templateRef: 'bm-edge-compact',
    // flat server lease — bm-edge-compact → $400/mo
    fixedDefaults: { estimatedMonthlyCostUsd: 400 },
    tags: ['edge', 'iot', 'compact'],
    fieldDefinitions: [
      {
        id: 'fd-edge-hostname',
        path: 'spec.hostname',
        displayName: 'OS Hostname',
        componentType: 'text',
        editable: true,
        defaultValue: '',
      },
      {
        id: 'fd-edge-zone',
        path: 'spec.zone',
        displayName: 'Edge Zone',
        componentType: 'select',
        editable: true,
        defaultValue: 'edge-west-1',
        options: ['edge-west-1', 'edge-east-1', 'edge-central-1'],
      },
      {
        id: 'fd-edge-watchdog',
        path: 'spec.hwWatchdog',
        displayName: 'Hardware Watchdog',
        componentType: 'boolean',
        editable: true,
        defaultValue: true,
      },
    ],
  },
]

let _items: FullCatalogItem[] = [...SEED_ITEMS]

const _listeners: Array<() => void> = []

function notify() {
  _listeners.forEach((fn) => fn())
}

export const catalogItemsStore = {
  getAll(): FullCatalogItem[] {
    return _items
  },
  getPublished(): FullCatalogItem[] {
    return _items.filter((i) => i.published && i.tenantEnabled)
  },
  add(item: FullCatalogItem) {
    _items = [..._items, item]
    notify()
  },
  toggle(id: string, published: boolean) {
    _items = _items.map((i) => (i.id === id ? { ...i, published, tenantEnabled: published } : i))
    notify()
  },
  update(item: FullCatalogItem) {
    _items = _items.map((i) => (i.id === item.id ? item : i))
    notify()
  },
  remove(id: string) {
    _items = _items.filter((i) => i.id !== id)
    notify()
  },
  subscribe(fn: () => void): () => void {
    _listeners.push(fn)
    return () => {
      const idx = _listeners.indexOf(fn)
      if (idx !== -1) _listeners.splice(idx, 1)
    }
  },
}
