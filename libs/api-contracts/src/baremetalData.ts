// ---------------------------------------------------------------------------
// Bare Metal as a Service (BMaaS) types and mock data
// Aligned with osac-pilot bare-metal-data.ts
// ---------------------------------------------------------------------------

export type BmDiscoveryState =
  | 'discovered'
  | 'inspecting'
  | 'available'
  | 'allocated'
  | 'maintenance'
  | 'failed'

export type BmProvisioningState =
  | 'queued'
  | 'inspecting'
  | 'installing'
  | 'configuring'
  | 'active'
  | 'failed'
  | 'releasing'

export type BmPowerState = 'on' | 'off' | 'unknown'

export interface BmDisk {
  name: string
  sizeGib: number
  type: 'SSD' | 'HDD' | 'NVMe'
}

export interface BmNic {
  name: string
  speedGbps: number
  mac: string
}

export interface BareMetalHost {
  id: string
  hostname: string
  serial: string
  manufacturer: string
  model: string
  bmcAddress: string
  cpuModel: string
  cores: number
  memoryGiB: number
  disks: BmDisk[]
  nics: BmNic[]
  gpu?: string
  rack: string
  zone: string
  powerState: BmPowerState
  discoveryState: BmDiscoveryState
  tenantAllocation?: string
  instanceRef?: string
  discoveredAt: string
  inspectedAt?: string
}

export interface BareMetalInstance {
  id: string
  name: string
  tenant: string
  hostRef: string
  flavor: string
  image: string
  vnet: string
  subnet: string
  vlan: number
  bootMode: 'uefi' | 'legacy'
  secureBoot: boolean
  ipmiUrl: string
  ip: string
  provisioningState: BmProvisioningState
  createdAt: string
  createdBy: string
}

export interface BmFlavor {
  id: string
  name: string
  cpu: string
  cores: number
  memoryGiB: number
  diskSummary: string
}

export interface BmImage {
  id: string
  name: string
  os: string
  version: string
}

// ---------------------------------------------------------------------------
// Mock seed data
// ---------------------------------------------------------------------------

export const BM_FLAVORS: BmFlavor[] = [
  {
    id: 'bm-standard-2x',
    name: 'Standard 2x',
    cpu: 'AMD EPYC 7452',
    cores: 32,
    memoryGiB: 256,
    diskSummary: '2× 1.92 TB SSD',
  },
  {
    id: 'bm-large-gpu',
    name: 'GPU Large',
    cpu: 'Intel Xeon Gold 6348',
    cores: 56,
    memoryGiB: 512,
    diskSummary: '2× 3.84 TB NVMe + 2× NVIDIA A100',
  },
  {
    id: 'bm-edge-compact',
    name: 'Edge Compact',
    cpu: 'Intel Atom C3758',
    cores: 8,
    memoryGiB: 64,
    diskSummary: '1× 480 GB SSD',
  },
  {
    id: 'bm-storage-heavy',
    name: 'Storage Heavy',
    cpu: 'AMD EPYC 7252',
    cores: 16,
    memoryGiB: 128,
    diskSummary: '12× 8 TB HDD',
  },
]

export const BM_IMAGES: BmImage[] = [
  { id: 'img-rhel9', name: 'RHEL 9.4', os: 'rhel', version: '9.4' },
  { id: 'img-rhel8', name: 'RHEL 8.10', os: 'rhel', version: '8.10' },
  { id: 'img-ubuntu22', name: 'Ubuntu 22.04 LTS', os: 'ubuntu', version: '22.04' },
  { id: 'img-centos9', name: 'CentOS Stream 9', os: 'centos', version: '9' },
  { id: 'img-custom', name: 'Custom image', os: 'custom', version: 'user-provided' },
]

export const BARE_METAL_HOSTS: BareMetalHost[] = [
  {
    id: 'bh-001',
    hostname: 'bm-rack01-node01.vertexa.internal',
    serial: 'SN-BM-00101',
    manufacturer: 'Dell',
    model: 'PowerEdge R750',
    bmcAddress: '10.0.200.11',
    cpuModel: 'AMD EPYC 7452',
    cores: 32,
    memoryGiB: 256,
    disks: [
      { name: 'sda', sizeGib: 1920, type: 'SSD' },
      { name: 'sdb', sizeGib: 1920, type: 'SSD' },
    ],
    nics: [
      { name: 'eth0', speedGbps: 25, mac: '00:11:22:33:44:01' },
      { name: 'eth1', speedGbps: 25, mac: '00:11:22:33:44:02' },
    ],
    rack: 'rack-01',
    zone: 'us-east-1',
    powerState: 'on',
    discoveryState: 'allocated',
    tenantAllocation: 'northstar',
    instanceRef: 'bmi-001',
    discoveredAt: '2025-12-01T10:00:00Z',
    inspectedAt: '2025-12-01T10:15:00Z',
  },
  {
    id: 'bh-002',
    hostname: 'bm-rack01-node02.vertexa.internal',
    serial: 'SN-BM-00102',
    manufacturer: 'Dell',
    model: 'PowerEdge R750',
    bmcAddress: '10.0.200.12',
    cpuModel: 'AMD EPYC 7452',
    cores: 32,
    memoryGiB: 256,
    disks: [
      { name: 'sda', sizeGib: 1920, type: 'SSD' },
      { name: 'sdb', sizeGib: 1920, type: 'SSD' },
    ],
    nics: [{ name: 'eth0', speedGbps: 25, mac: '00:11:22:33:44:11' }],
    rack: 'rack-01',
    zone: 'us-east-1',
    powerState: 'on',
    discoveryState: 'allocated',
    tenantAllocation: 'northstar',
    instanceRef: 'bmi-002',
    discoveredAt: '2025-12-01T10:00:00Z',
    inspectedAt: '2025-12-01T10:20:00Z',
  },
  {
    id: 'bh-003',
    hostname: 'bm-rack02-node01.vertexa.internal',
    serial: 'SN-BM-00201',
    manufacturer: 'HPE',
    model: 'ProLiant DL380 Gen10',
    bmcAddress: '10.0.200.21',
    cpuModel: 'Intel Xeon Gold 6348',
    cores: 56,
    memoryGiB: 512,
    disks: [{ name: 'nvme0', sizeGib: 3840, type: 'NVMe' }],
    nics: [{ name: 'eth0', speedGbps: 100, mac: '00:AA:BB:CC:DD:01' }],
    gpu: 'NVIDIA A100 80GB',
    rack: 'rack-02',
    zone: 'us-east-1',
    powerState: 'on',
    discoveryState: 'allocated',
    tenantAllocation: 'evergreen',
    instanceRef: 'bmi-003',
    discoveredAt: '2026-01-10T08:00:00Z',
    inspectedAt: '2026-01-10T08:30:00Z',
  },
  {
    id: 'bh-004',
    hostname: 'bm-rack02-node02.vertexa.internal',
    serial: 'SN-BM-00202',
    manufacturer: 'HPE',
    model: 'ProLiant DL380 Gen10',
    bmcAddress: '10.0.200.22',
    cpuModel: 'Intel Xeon Gold 6348',
    cores: 56,
    memoryGiB: 512,
    disks: [{ name: 'nvme0', sizeGib: 3840, type: 'NVMe' }],
    nics: [{ name: 'eth0', speedGbps: 100, mac: '00:AA:BB:CC:DD:02' }],
    rack: 'rack-02',
    zone: 'us-east-1',
    powerState: 'off',
    discoveryState: 'available',
    discoveredAt: '2026-01-10T08:00:00Z',
    inspectedAt: '2026-01-10T08:45:00Z',
  },
  {
    id: 'bh-005',
    hostname: 'bm-rack03-node01.vertexa.internal',
    serial: 'SN-BM-00301',
    manufacturer: 'Supermicro',
    model: 'SYS-6029P-TR',
    bmcAddress: '10.0.200.31',
    cpuModel: 'AMD EPYC 7252',
    cores: 16,
    memoryGiB: 128,
    disks: [{ name: 'sda', sizeGib: 8192, type: 'HDD' }],
    nics: [{ name: 'eth0', speedGbps: 10, mac: '00:BB:CC:DD:EE:01' }],
    rack: 'rack-03',
    zone: 'us-east-2',
    powerState: 'off',
    discoveryState: 'maintenance',
    discoveredAt: '2025-11-01T12:00:00Z',
    inspectedAt: '2025-11-01T12:20:00Z',
  },
  {
    id: 'bh-006',
    hostname: 'bm-rack03-node02.vertexa.internal',
    serial: 'SN-BM-00302',
    manufacturer: 'Supermicro',
    model: 'SYS-6029P-TR',
    bmcAddress: '10.0.200.32',
    cpuModel: 'AMD EPYC 7252',
    cores: 16,
    memoryGiB: 128,
    disks: [{ name: 'sda', sizeGib: 480, type: 'SSD' }],
    nics: [{ name: 'eth0', speedGbps: 10, mac: '00:BB:CC:DD:EE:02' }],
    rack: 'rack-03',
    zone: 'us-east-2',
    powerState: 'unknown',
    discoveryState: 'discovered',
    discoveredAt: '2026-06-01T09:00:00Z',
  },
  {
    id: 'bh-007',
    hostname: 'bm-rack03-node03.vertexa.internal',
    serial: 'SN-BM-00303',
    manufacturer: 'Dell',
    model: 'PowerEdge R440',
    bmcAddress: '10.0.200.33',
    cpuModel: 'Intel Atom C3758',
    cores: 8,
    memoryGiB: 64,
    disks: [{ name: 'sda', sizeGib: 480, type: 'SSD' }],
    nics: [{ name: 'eth0', speedGbps: 10, mac: '00:CC:DD:EE:FF:03' }],
    rack: 'rack-03',
    zone: 'us-east-2',
    powerState: 'on',
    discoveryState: 'inspecting',
    discoveredAt: '2026-06-02T14:00:00Z',
  },
]

export const BARE_METAL_INSTANCES: BareMetalInstance[] = [
  {
    id: 'bmi-001',
    name: 'ns-bm-analytics-01',
    tenant: 'northstar',
    hostRef: 'bh-001',
    flavor: 'bm-standard-2x',
    image: 'img-rhel9',
    vnet: 'prod-network',
    subnet: 'prod-subnet-a',
    vlan: 100,
    bootMode: 'uefi',
    secureBoot: true,
    ipmiUrl: 'https://10.0.200.11/redfish/v1',
    ip: '10.10.1.50',
    provisioningState: 'active',
    createdAt: '2026-01-15T10:00:00Z',
    createdBy: 'cmorgan@northstarbank.com',
  },
  {
    id: 'bmi-002',
    name: 'ns-bm-compute-01',
    tenant: 'northstar',
    hostRef: 'bh-002',
    flavor: 'bm-standard-2x',
    image: 'img-rhel9',
    vnet: 'prod-network',
    subnet: 'prod-subnet-b',
    vlan: 100,
    bootMode: 'uefi',
    secureBoot: true,
    ipmiUrl: 'https://10.0.200.12/redfish/v1',
    ip: '10.10.1.51',
    provisioningState: 'active',
    createdAt: '2026-01-20T11:30:00Z',
    createdBy: 'cmorgan@northstarbank.com',
  },
  {
    id: 'bmi-003',
    name: 'eg-bm-ml-gpu-01',
    tenant: 'evergreen',
    hostRef: 'bh-003',
    flavor: 'bm-large-gpu',
    image: 'img-ubuntu22',
    vnet: 'dev-network',
    subnet: 'prod-subnet-a',
    vlan: 200,
    bootMode: 'uefi',
    secureBoot: false,
    ipmiUrl: 'https://10.0.200.21/redfish/v1',
    ip: '10.10.1.60',
    provisioningState: 'active',
    createdAt: '2026-02-05T09:00:00Z',
    createdBy: 'priya.nair@bluestonefinancial.com',
  },
  {
    id: 'bmi-004',
    name: 'ns-bm-staging-01',
    tenant: 'northstar',
    hostRef: 'bh-001',
    flavor: 'bm-storage-heavy',
    image: 'img-centos9',
    vnet: 'dev-network',
    subnet: 'prod-subnet-b',
    vlan: 300,
    bootMode: 'legacy',
    secureBoot: false,
    ipmiUrl: 'https://10.0.200.11/redfish/v1',
    ip: '10.10.2.50',
    provisioningState: 'installing',
    createdAt: '2026-06-02T08:00:00Z',
    createdBy: 'cmorgan@northstarbank.com',
  },
]
