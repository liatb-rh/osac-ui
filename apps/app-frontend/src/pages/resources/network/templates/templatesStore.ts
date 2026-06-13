/**
 * Simple client-side store for mock BackingTemplate data.
 * Shared between GlobalTemplatesPage (list) and GlobalTemplateDetailPage (detail).
 */
import type { CatalogItemType } from '@osac/ui-components'

export interface BackingTemplate {
  id: string
  name: string
  type: CatalogItemType
  description: string
  assignedGroups: string[]
}

export const INITIAL_TEMPLATES: BackingTemplate[] = [
  {
    id: 'tpl-rhel9',
    name: 'vm-rhel9',
    type: 'vm',
    description: 'Red Hat Enterprise Linux 9 base image for VM workloads.',
    assignedGroups: ['northstar-prod', 'northstar-dev', 'evergreen-prod'],
  },
  {
    id: 'tpl-rhel9-gpu',
    name: 'vm-rhel9-gpu',
    type: 'vm',
    description: 'RHEL 9 with NVIDIA A100 GPU driver support.',
    assignedGroups: ['northstar-prod'],
  },
  {
    id: 'tpl-ubuntu22',
    name: 'vm-ubuntu22',
    type: 'vm',
    description: 'Ubuntu 22.04 LTS base image.',
    assignedGroups: ['evergreen-prod', 'vertexa-edge'],
  },
  {
    id: 'tpl-win2022',
    name: 'vm-win2022',
    type: 'vm',
    description: 'Windows Server 2022.',
    assignedGroups: [],
  },
  {
    id: 'tpl-ocp417',
    name: 'ocp-4.17',
    type: 'cluster',
    description: 'OpenShift Container Platform 4.17 cluster template.',
    assignedGroups: ['northstar-prod', 'evergreen-prod'],
  },
  {
    id: 'tpl-ocp417-edge',
    name: 'ocp-4.17-edge',
    type: 'cluster',
    description: 'OpenShift 4.17 lightweight edge profile.',
    assignedGroups: ['vertexa-edge'],
  },
  {
    id: 'tpl-bm-standard',
    name: 'bm-standard',
    type: 'baremetal',
    description: 'Bare metal provisioning template — standard profile.',
    assignedGroups: ['northstar-prod'],
  },
]

let _templates: BackingTemplate[] = [...INITIAL_TEMPLATES]
const _listeners = new Set<() => void>()

export const templatesStore = {
  getAll(): BackingTemplate[] {
    return _templates
  },
  getById(id: string): BackingTemplate | undefined {
    return _templates.find((t) => t.id === id)
  },
  addGroup(tplId: string, group: string) {
    _templates = _templates.map((t) =>
      t.id === tplId ? { ...t, assignedGroups: [...t.assignedGroups, group] } : t,
    )
    _listeners.forEach((fn) => fn())
  },
  removeGroup(tplId: string, group: string) {
    _templates = _templates.map((t) =>
      t.id === tplId ? { ...t, assignedGroups: t.assignedGroups.filter((g) => g !== group) } : t,
    )
    _listeners.forEach((fn) => fn())
  },
  subscribe(fn: () => void): () => void {
    _listeners.add(fn)
    return () => {
      _listeners.delete(fn)
    }
  },
}
