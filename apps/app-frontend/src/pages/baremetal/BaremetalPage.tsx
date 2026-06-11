/**
 * flow: tenant-workloads
 * step: bm_list
 * route: /baremetal
 *
 * Tenant (user + admin) — bare metal instance list + Request wizard.
 */
import { css } from '@emotion/css'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Button,
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Label,
  MenuToggle,
  Modal,
  ModalBody,
  ModalHeader,
  PageSection,
  SearchInput,
  Select,
  SelectList,
  SelectOption,
  Switch,
  TextInput,
  ToggleGroup,
  ToggleGroupItem,
  Wizard,
  WizardStep,
} from '@patternfly/react-core'
import { ActionsColumn } from '@patternfly/react-table'
import { PlusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon'
import { BARE_METAL_INSTANCES, BM_FLAVORS, BM_IMAGES } from '@osac/api-contracts'
import type { BareMetalInstance, BmFlavor } from '@osac/api-contracts'
import {
  FullCatalogItemCard,
  KpiHeader,
  ObjectsTable,
  PageHeader,
  PublicIpField,
} from '@osac/ui-components'
import type { ObjectsTableColumn } from '@osac/ui-components'
import { usePublicIPPools, usePublicIPs } from '../../hooks/useNetworking'
import { catalogItemsStore } from '../workloads/catalogItemsStore'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type InstanceFilter = 'all' | 'active' | 'inprogress'

function BmStateLabel({ state }: { state: string }) {
  if (state === 'active')
    return (
      <Label color="green" isCompact>
        Active
      </Label>
    )
  if (state === 'installing' || state === 'configuring' || state === 'queued')
    return (
      <Label color="blue" isCompact>
        {state}
      </Label>
    )
  if (state === 'failed')
    return (
      <Label color="red" isCompact>
        Failed
      </Label>
    )
  if (state === 'releasing')
    return (
      <Label color="orange" isCompact>
        Releasing
      </Label>
    )
  return (
    <Label color="grey" isCompact>
      {state}
    </Label>
  )
}

const filterBarCss = css`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
`

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function BaremetalPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [instances, setInstances] = useState<BareMetalInstance[]>(BARE_METAL_INSTANCES)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<InstanceFilter>('all')
  const [wizardOpen, setWizardOpen] = useState(false)

  const { data: pools = [] } = usePublicIPPools()
  const { data: publicIPs = [] } = usePublicIPs()
  const allocatedIPs = publicIPs.filter((ip) => ip.status.state === 'PUBLIC_IP_STATE_ALLOCATED')

  // Pre-select catalog item from URL search param and auto-open wizard
  const catalogItemIdFromUrl = searchParams.get('catalogItem')
  const catalogItems = catalogItemsStore.getPublished().filter((i) => i.type === 'baremetal')
  const [wizardCatalogItem, setWizardCatalogItem] = useState<string | null>(catalogItemIdFromUrl)

  useEffect(() => {
    if (catalogItemIdFromUrl) {
      setWizardCatalogItem(catalogItemIdFromUrl)
      setWizardOpen(true)
    }
  }, [catalogItemIdFromUrl])

  // Wizard state
  const [wName, setWName] = useState('')
  const [wFlavor, setWFlavor] = useState<BmFlavor | null>(null)
  const [wFlavorOpen, setWFlavorOpen] = useState(false)
  const [wImage, setWImage] = useState('')
  const [wSecureBoot, setWSecureBoot] = useState(false)
  const [wVnet, setWVnet] = useState('')
  const [wSubnet, setWSubnet] = useState('')
  const [wVlan, setWVlan] = useState('')

  const filtered = instances.filter((i) => {
    if (filter === 'active' && i.provisioningState !== 'active') return false
    if (
      filter === 'inprogress' &&
      !['installing', 'configuring', 'queued'].includes(i.provisioningState)
    )
      return false
    if (search.trim() && !i.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  function handleWizardSubmit() {
    const newInstance: BareMetalInstance = {
      id: `bmi-${Date.now()}`,
      name: wName || `bm-instance-${Date.now()}`,
      tenant: 'northstar',
      hostRef: 'bh-004',
      flavor: wFlavor?.id ?? BM_FLAVORS[0].id,
      image: wImage || BM_IMAGES[0].id,
      vnet: wVnet || 'prod-network',
      subnet: wSubnet || 'prod-subnet-a',
      vlan: Number(wVlan) || 100,
      bootMode: 'uefi',
      secureBoot: wSecureBoot,
      ipmiUrl: 'https://10.0.200.22/redfish/v1',
      ip: '10.10.1.99',
      provisioningState: 'queued',
      createdAt: new Date().toISOString(),
      createdBy: 'cmorgan@northstarbank.com',
    }
    setInstances((prev) => [newInstance, ...prev])
    setWizardOpen(false)
  }

  const columns: ObjectsTableColumn<BareMetalInstance>[] = [
    {
      label: 'Name',
      render: (i) => (
        <button
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            textDecoration: 'underline dashed',
            textUnderlineOffset: '3px',
          }}
          onClick={() => navigate(`/baremetal/${i.id}`)}
        >
          {i.name}
        </button>
      ),
    },
    {
      label: 'Status',
      render: (i) => <BmStateLabel state={i.provisioningState} />,
    },
    {
      label: 'Flavor',
      render: (i) => {
        const flavor = BM_FLAVORS.find((f) => f.id === i.flavor)
        return <code>{flavor?.name ?? i.flavor}</code>
      },
    },
    {
      label: 'Image',
      render: (i) => {
        const img = BM_IMAGES.find((m) => m.id === i.image)
        return img?.name ?? i.image
      },
    },
    {
      label: 'Host',
      render: (i) => <code>{i.hostRef}</code>,
    },
    {
      label: 'Network',
      render: (i) => `${i.vnet} / ${i.subnet} · VLAN ${i.vlan}`,
    },
    {
      label: 'IP',
      render: (i) => <code>{i.ip}</code>,
    },
    {
      isActionCell: true,
      render: (i) => (
        <ActionsColumn
          items={[
            {
              title: i.provisioningState === 'active' ? 'Power off' : 'Power on',
              onClick: () => {},
            },
            { title: 'Reboot', onClick: () => {} },
            { title: 'Launch BMC console', onClick: () => window.open(i.ipmiUrl, '_blank') },
            { isSeparator: true },
            {
              title: 'Release host',
              onClick: () => {
                setInstances((prev) => prev.filter((item) => item.id !== i.id))
              },
            },
          ]}
        />
      ),
    },
  ]

  const active = instances.filter((i) => i.provisioningState === 'active').length
  const inProgress = instances.filter((i) =>
    ['installing', 'configuring', 'queued'].includes(i.provisioningState),
  ).length

  return (
    <PageSection isFilled>
      <PageHeader
        title="My Bare Metal"
        description="Request and manage bare metal instances provisioned from the catalog."
        actions={
          <Button variant="primary" icon={<PlusCircleIcon />} onClick={() => setWizardOpen(true)}>
            Request bare metal
          </Button>
        }
      />

      <KpiHeader
        items={[
          { label: 'Total', value: String(instances.length) },
          { label: 'Active', value: String(active), tone: 'success' },
          { label: 'In progress', value: String(inProgress) },
        ]}
      />

      <div className={filterBarCss} style={{ marginTop: 16 }}>
        <SearchInput
          placeholder="Search by name…"
          value={search}
          onChange={(_, v) => setSearch(v)}
          onClear={() => setSearch('')}
          style={{ maxWidth: 300 }}
        />
        <ToggleGroup aria-label="Filter instances">
          {(['all', 'active', 'inprogress'] as InstanceFilter[]).map((f) => (
            <ToggleGroupItem
              key={f}
              text={f === 'all' ? 'All' : f === 'active' ? 'Active' : 'In progress'}
              isSelected={filter === f}
              onChange={() => setFilter(f)}
            />
          ))}
        </ToggleGroup>
      </div>

      <ObjectsTable
        ariaLabel="Bare metal instances"
        rows={filtered}
        getRowKey={(i) => i.id}
        columns={columns}
        onRowClick={(i) => navigate(`/baremetal/${i.id}`)}
        defaultPageSize={10}
      />

      {/* Request wizard */}
      <Modal
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        variant="large"
        aria-label="Request bare metal"
      >
        <ModalHeader
          title="Request Bare Metal"
          description="Provision a bare metal instance from the catalog."
        />
        <ModalBody style={{ minHeight: 520 }}>
          <Wizard onClose={() => setWizardOpen(false)} onSave={handleWizardSubmit} height={500}>
            {/* Step 1 — Catalog item */}
            <WizardStep name="Catalog item" id="bm-catalog">
              {catalogItems.length === 0 ? (
                <p style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>
                  No bare metal catalog items available. Ask your tenant admin to publish one.
                </p>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: 12,
                  }}
                >
                  {catalogItems.map((item) => (
                    <FullCatalogItemCard
                      key={item.id}
                      item={item}
                      onClick={(i) => setWizardCatalogItem(i.id)}
                    />
                  ))}
                </div>
              )}
              {wizardCatalogItem && (
                <p
                  style={{
                    marginTop: 8,
                    fontSize: '0.875rem',
                    color: 'var(--pf-t--global--text--color--subtle)',
                  }}
                >
                  Selected:{' '}
                  <strong>
                    {catalogItems.find((i) => i.id === wizardCatalogItem)?.title ??
                      wizardCatalogItem}
                  </strong>
                </p>
              )}
            </WizardStep>

            {/* Step 2 — Basic parameters */}
            <WizardStep name="Basic parameters" id="bm-basic">
              <Form>
                <FormGroup label="Instance name" fieldId="bm-name" isRequired>
                  <TextInput
                    id="bm-name"
                    value={wName}
                    onChange={(_, v) => setWName(v)}
                    placeholder="e.g. my-bm-node-01"
                  />
                </FormGroup>
                <FormGroup label="Node profile (flavor)" fieldId="bm-flavor">
                  <Select
                    isOpen={wFlavorOpen}
                    onOpenChange={setWFlavorOpen}
                    toggle={(ref) => (
                      <MenuToggle ref={ref} onClick={() => setWFlavorOpen((v) => !v)}>
                        {wFlavor?.name ?? 'Select a flavor'}
                      </MenuToggle>
                    )}
                    selected={wFlavor?.id}
                    onSelect={(_, v) => {
                      setWFlavor(BM_FLAVORS.find((f) => f.id === v) ?? null)
                      setWFlavorOpen(false)
                    }}
                  >
                    <SelectList>
                      {BM_FLAVORS.map((f) => (
                        <SelectOption
                          key={f.id}
                          value={f.id}
                          description={`${f.cores} cores · ${f.memoryGiB} GiB · ${f.diskSummary}`}
                        >
                          {f.name}
                        </SelectOption>
                      ))}
                    </SelectList>
                  </Select>
                </FormGroup>
              </Form>
            </WizardStep>

            {/* Step 3 — Image */}
            <WizardStep name="Image" id="bm-image">
              <Form>
                <FormGroup label="Boot image" fieldId="bm-img" isRequired>
                  <FormSelect id="bm-img" value={wImage} onChange={(_, v) => setWImage(v)}>
                    <FormSelectOption value="" label="Select an image" />
                    {BM_IMAGES.map((img) => (
                      <FormSelectOption key={img.id} value={img.id} label={img.name} />
                    ))}
                  </FormSelect>
                </FormGroup>
                <FormGroup fieldId="bm-secboot">
                  <Switch
                    id="bm-secboot"
                    label="Enable Secure Boot"
                    isChecked={wSecureBoot}
                    onChange={(_, v) => setWSecureBoot(v)}
                  />
                </FormGroup>
              </Form>
            </WizardStep>

            {/* Step 4 — Dynamic parameters (placeholder) */}
            <WizardStep name="Dynamic parameters" id="bm-dyn">
              <p style={{ color: 'var(--pf-t--global--text--color--subtle)', fontSize: '0.9rem' }}>
                {wizardCatalogItem
                  ? 'No additional parameters required for this catalog item.'
                  : 'No catalog item selected — no dynamic parameters to configure.'}
              </p>
            </WizardStep>

            {/* Step 5 — Networking */}
            <WizardStep name="Networking" id="bm-net">
              <Form>
                <FormGroup label="Virtual network" fieldId="bm-vnet">
                  <TextInput
                    id="bm-vnet"
                    value={wVnet}
                    onChange={(_, v) => setWVnet(v)}
                    placeholder="e.g. prod-network"
                  />
                </FormGroup>
                <FormGroup label="Subnet" fieldId="bm-subnet">
                  <TextInput
                    id="bm-subnet"
                    value={wSubnet}
                    onChange={(_, v) => setWSubnet(v)}
                    placeholder="e.g. prod-subnet-a"
                  />
                </FormGroup>
                <FormGroup label="VLAN" fieldId="bm-vlan">
                  <TextInput
                    id="bm-vlan"
                    value={wVlan}
                    onChange={(_, v) => setWVlan(v)}
                    placeholder="e.g. 100"
                    type="number"
                  />
                </FormGroup>
                <PublicIpField pools={pools} allocatedIPs={allocatedIPs} />
              </Form>
            </WizardStep>

            {/* Step 6 — Review */}
            <WizardStep name="Review" id="bm-review" footer={{ nextButtonText: 'Submit request' }}>
              <dl
                style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '6px 16px' }}
              >
                <dt>
                  <strong>Name:</strong>
                </dt>
                <dd>{wName || '—'}</dd>
                <dt>
                  <strong>Flavor:</strong>
                </dt>
                <dd>{wFlavor?.name ?? '—'}</dd>
                <dt>
                  <strong>Image:</strong>
                </dt>
                <dd>{BM_IMAGES.find((i) => i.id === wImage)?.name ?? '—'}</dd>
                <dt>
                  <strong>Secure Boot:</strong>
                </dt>
                <dd>{wSecureBoot ? 'Enabled' : 'Disabled'}</dd>
                <dt>
                  <strong>Network:</strong>
                </dt>
                <dd>
                  {wVnet || '—'} / {wSubnet || '—'} · VLAN {wVlan || '—'}
                </dd>
              </dl>
            </WizardStep>
          </Wizard>
        </ModalBody>
      </Modal>
    </PageSection>
  )
}
