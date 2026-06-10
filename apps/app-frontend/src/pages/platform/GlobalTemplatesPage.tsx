/**
 * flow: provider-administration
 * step: pad_global_templates
 * route: /provider/templates
 */
import { css } from '@emotion/css'
import { useState } from 'react'
import {
  Button,
  Modal,
  ModalBody,
  ModalHeader,
  ModalVariant,
  PageSection,
} from '@patternfly/react-core'
import { PlusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon'
import { type CatalogItem, CatalogItemCard, PageHeader, StatCard } from '@osac/ui-components'
import { PublishCatalogItemWizard } from '../../components/catalog'

// ── Mock data (osac-pilot catalog items model) ────────────────────────────────

const GLOBAL_ITEMS: CatalogItem[] = [
  {
    id: 'vm-rhel9-s',
    name: 'RHEL 9 — Small',
    template: 'vm-rhel9',
    variant: 'S',
    cpu: 2,
    ram: 8,
    presets: 4,
    published: true,
  },
  {
    id: 'vm-rhel9-m',
    name: 'RHEL 9 — Medium',
    template: 'vm-rhel9',
    variant: 'M',
    cpu: 4,
    ram: 16,
    presets: 4,
    published: true,
  },
  {
    id: 'vm-rhel9-l',
    name: 'RHEL 9 — Large',
    template: 'vm-rhel9',
    variant: 'L',
    cpu: 8,
    ram: 32,
    presets: 4,
    published: true,
  },
  {
    id: 'vm-rhel9-gpu',
    name: 'RHEL 9 — GPU A100',
    template: 'vm-rhel9-gpu',
    variant: 'XL',
    cpu: 32,
    ram: 256,
    presets: 6,
    published: false,
  },
  {
    id: 'ocp-edge',
    name: 'OpenShift 4.17 — Edge',
    template: 'ocp-4.17',
    variant: 'Edge',
    cpu: 3,
    ram: 24,
    presets: 8,
    published: true,
  },
  {
    id: 'vm-ubuntu22-s',
    name: 'Ubuntu 22 — Small',
    template: 'vm-ubuntu22',
    variant: 'S',
    cpu: 2,
    ram: 8,
    presets: 3,
    published: true,
  },
  {
    id: 'vm-win2022-m',
    name: 'Windows 2022 — Medium',
    template: 'vm-win2022',
    variant: 'M',
    cpu: 4,
    ram: 16,
    presets: 4,
    published: false,
  },
]

const BACKING_TEMPLATES = [...new Set(GLOBAL_ITEMS.map((i) => i.template))]

const kpiGridCss = css`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 1.5rem;
`

const cardGridCss = css`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
`

const modalBodyCss = css`
  min-height: 480px;
`

// ── Page ──────────────────────────────────────────────────────────────────────

export function GlobalTemplatesPage() {
  const [items, setItems] = useState<CatalogItem[]>(GLOBAL_ITEMS)
  const [publishOpen, setPublishOpen] = useState(false)

  const published = items.filter((i) => i.published).length
  const avgPresets = Math.round(items.reduce((a, i) => a + i.presets, 0) / items.length)

  function handleTogglePublish(id: string, pub: boolean) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, published: pub } : i)))
  }

  return (
    <PageSection isFilled>
      <PageHeader
        title="Global Templates"
        description="User-facing offerings layered on top of Ansible templates. Publish curated variants (S/M/L) with preset values and field constraints."
        actions={
          <Button variant="primary" icon={<PlusCircleIcon />} onClick={() => setPublishOpen(true)}>
            Publish catalog item
          </Button>
        }
      />

      {/* KPI row */}
      <div className={kpiGridCss}>
        <StatCard label="Catalog items" value={String(items.length)} />
        <StatCard label="Published" value={String(published)} tone="success" />
        <StatCard
          label="Backing templates"
          value={String(BACKING_TEMPLATES.length)}
          hint="Ansible roles"
        />
        <StatCard label="Avg presets / item" value={String(avgPresets)} />
      </div>

      {/* Card grid */}
      <div className={cardGridCss}>
        {items.map((item) => (
          <CatalogItemCard
            key={item.id}
            item={item}
            onTogglePublish={handleTogglePublish}
            onEditPresets={() => {
              /* TODO: open preset editor */
            }}
          />
        ))}
      </div>

      <Modal
        variant={ModalVariant.large}
        isOpen={publishOpen}
        onClose={() => setPublishOpen(false)}
        aria-label="Publish catalog item"
      >
        <ModalHeader
          title="Publish catalog item"
          description="Curated user-facing offering layered on top of an Ansible template."
        />
        <ModalBody className={modalBodyCss}>
          <PublishCatalogItemWizard
            backingTemplates={BACKING_TEMPLATES}
            onDone={() => setPublishOpen(false)}
          />
        </ModalBody>
      </Modal>
    </PageSection>
  )
}
