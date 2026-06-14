import type { StorageTier } from '@osac/api-contracts'

export interface TierMeta {
  iops: string
  latency: string
  media: string
  throughputGbps: number
  capacityTib: number
  usedTib: number
  vastCluster: string
  protocol: string
  csiDriver: string
  reclaimPolicy: string
  volumeBindingMode: string
  allowVolumeExpansion: boolean
  encryption: string
  replication: string
  isDefault: boolean
  description: string
}

const QOS_META: Record<string, TierMeta> = {
  fast: {
    iops: '200k',
    latency: '<0.2 ms',
    media: 'NVMe SSD RAID-10',
    throughputGbps: 40,
    capacityTib: 120,
    usedTib: 38,
    vastCluster: 'vast-prod-α',
    protocol: 'NFSv4.1',
    csiDriver: 'csi.vastdata.com',
    reclaimPolicy: 'Retain',
    volumeBindingMode: 'WaitForFirstConsumer',
    allowVolumeExpansion: true,
    encryption: 'AES-256 + per-tenant KMS',
    replication: 'sync',
    isDefault: false,
    description: 'Latency-critical OLTP and trading workloads.',
  },
  standard: {
    iops: '100k',
    latency: '<0.5 ms',
    media: 'NVMe SSD',
    throughputGbps: 25,
    capacityTib: 480,
    usedTib: 211,
    vastCluster: 'vast-prod-α',
    protocol: 'NFSv4.1',
    csiDriver: 'csi.vastdata.com',
    reclaimPolicy: 'Delete',
    volumeBindingMode: 'WaitForFirstConsumer',
    allowVolumeExpansion: true,
    encryption: 'AES-256 at rest',
    replication: 'async',
    isDefault: true,
    description: 'General-purpose production. Default tier for new tenant clusters.',
  },
  balanced: {
    iops: '30k',
    latency: '<2 ms',
    media: 'SATA SSD',
    throughputGbps: 10,
    capacityTib: 960,
    usedTib: 312,
    vastCluster: 'vast-prod-β',
    protocol: 'NFSv4.1',
    csiDriver: 'csi.vastdata.com',
    reclaimPolicy: 'Delete',
    volumeBindingMode: 'Immediate',
    allowVolumeExpansion: true,
    encryption: 'AES-256 at rest',
    replication: 'async',
    isDefault: false,
    description: 'Capacity-oriented working sets and dev/test data.',
  },
  archive: {
    iops: '5k',
    latency: '<20 ms',
    media: 'HDD (SMR)',
    throughputGbps: 4,
    capacityTib: 2400,
    usedTib: 0,
    vastCluster: 'vast-archive-γ',
    protocol: 'S3',
    csiDriver: 'csi.vastdata.com',
    reclaimPolicy: 'Retain',
    volumeBindingMode: 'Immediate',
    allowVolumeExpansion: false,
    encryption: 'AES-256 at rest',
    replication: 'none',
    isDefault: false,
    description: 'Cold archive and long-term backup.',
  },
}

export function tierMeta(t: StorageTier): TierMeta {
  return (
    QOS_META[(t.qosClass ?? '').toLowerCase()] ?? {
      iops: '—',
      latency: '—',
      media: '—',
      throughputGbps: 0,
      capacityTib: 100,
      usedTib: 0,
      vastCluster: '—',
      protocol: 'NFSv4.1',
      csiDriver: 'csi.vastdata.com',
      reclaimPolicy: 'Delete',
      volumeBindingMode: 'Immediate',
      allowVolumeExpansion: false,
      encryption: 'AES-256 at rest',
      replication: 'none',
      isDefault: false,
      description: '',
    }
  )
}

export const MOCK_CONSUMERS: Record<
  string,
  { tenant: string; clusters: string[]; pvcs: number; usedTib: number }[]
> = {
  fast: [
    { tenant: 'northstar', clusters: ['prod-ocp'], pvcs: 14, usedTib: 22.4 },
    { tenant: 'atlas', clusters: ['atlas-prod'], pvcs: 6, usedTib: 15.6 },
  ],
  standard: [
    { tenant: 'northstar', clusters: ['prod-ocp', 'stg-ocp'], pvcs: 142, usedTib: 168 },
    { tenant: 'atlas', clusters: ['atlas-prod'], pvcs: 37, usedTib: 43 },
  ],
  balanced: [
    { tenant: 'northstar', clusters: ['dev-ocp'], pvcs: 58, usedTib: 220 },
    { tenant: 'helios', clusters: ['helios-dev'], pvcs: 22, usedTib: 92 },
  ],
  archive: [],
}
