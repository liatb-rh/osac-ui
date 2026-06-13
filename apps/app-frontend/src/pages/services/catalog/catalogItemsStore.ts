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
    fixedDefaults: { cpu: 2, memoryGib: 8, bootDiskSizeGib: 40 },
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
    fixedDefaults: { cpu: 4, memoryGib: 16, bootDiskSizeGib: 80 },
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
    fixedDefaults: { cpu: 3, memoryGib: 24, ocpVersion: '4.17' },
    tags: ['openshift', 'edge'],
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
