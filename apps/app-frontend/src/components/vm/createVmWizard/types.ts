import type { PublicIpSelection } from '@osac/ui-components'
export type { PublicIpSelection }

export interface CreateVmWizardHandle {
  open: () => void
  openFromTemplate: (templateId: string) => void
  openFromClone: (sourceVmId: string) => void
}

export type DeploymentMode = 'new' | 'template' | 'clone'

export interface WizardState {
  mode: DeploymentMode
  osFamilyNew: string
  osTypeNew: string
  bootSource: 'volume' | 'none' | null
  cpuNew: string
  memoryNew: string
  /** Optional cloud-init / user-data for new path; BFF may map to spec.userData when non-empty. */
  cloudInitUserDataNew: string
  selectedTemplateId: string | null
  /** Template path: boot disk size (GiB), integer string; maps to `spec.boot_disk.size_gib`. */
  templateBootDiskSizeGib: string
  /** vCPU count; maps to `spec.cores` (int32). Seeded from template defaults in the UI. */
  templateCores: string
  /** Memory in GiB; maps to `spec.memory_gib`. Seeded from template defaults. */
  templateMemoryGib: string
  /** Fulfillment REST `run_strategy`: `Always` or `Halted`. */
  templateRunStrategy: string
  /** Optional virtual network fulfillment id; used to filter subnets in the UI. */
  templateVirtualNetworkId?: string
  /** Optional subnet fulfillment id; maps to `spec.subnet`. */
  templateSubnetId: string
  /** Selected security group fulfillment ids; maps to `spec.security_groups`. */
  templateSecurityGroupIds: string[]
  /** Operating system family; temporary v0.1 stopgap until compute image construct is ready. */
  templateOsType: 'linux' | 'windows' | ''
  /** SSH public key; maps to `spec.ssh_key`. */
  templateSshPublicKey: string
  /** Cloud-init / ignition-style payload; maps to `spec.user_data`. */
  templateUserData: string
  /**
   * Optional extra data disks as comma-separated GiB sizes (e.g. `50, 100`);
   * maps to `spec.additional_disks` as `{ size_gib }[]`.
   */
  templateAdditionalDisksGibRaw: string
  templateVmName: string
  cloneSourceVmId: string | null
  cloneNewName: string
  startAfterCreate: boolean
  /** Optional public IP selection from the Network step. */
  publicIp: PublicIpSelection | null
}

export type UpdateFn = <K extends keyof WizardState>(key: K, value: WizardState[K]) => void
