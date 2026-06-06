/**
 * flow: provider-administration
 * step: pad_storage_tiers
 * route: /storage-tiers
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { css } from '@emotion/css'
import {
  Button,
  Checkbox,
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
  ModalVariant,
  PageSection,
  Spinner,
  Switch,
  TextArea,
  TextInput,
  Wizard,
  WizardStep,
} from '@patternfly/react-core'
import { PlusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon'
import type { StorageTier } from '@osac/api-contracts'
import { OcLink } from '@osac/ui-components'
import { usePatchStorageTier, useStorageTiers } from '../../hooks/useAgents'
import { PageHeader } from '../../components/layout'

// ── Mock enrichment ────────────────────────────────────────────────────────────

interface TierMeta {
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

const tierMetaSubtextCss = css`
  font-size: 12px;
  color: #5b6b7c;
  margin-top: 2px;
`

const tierMetricLabelCss = css`
  color: #5b6b7c;
  font-size: 12px;
`

const tierMetricValueCss = css`
  font-size: 13px;
`

const usageBarTrackCss = css`
  height: 4px;
  background: #eef3f8;
  border-radius: 2px;
  margin-top: 4px;
`

const tiersPanelCss = css`
  background: var(--pf-t--global--background--color--primary--default);
  border: 1px solid var(--pf-t--global--border--color--default);
  border-radius: var(--pf-t--global--border--radius--medium);
  padding: 20px;
  display: grid;
  gap: 12px;
`

// ── Row ────────────────────────────────────────────────────────────────────────

function TierRow({
  tier,
  onToggle,
}: {
  tier: StorageTier
  onToggle: (t: StorageTier, v: boolean) => void
}) {
  const navigate = useNavigate()
  const meta = tierMeta(tier)
  const usedPct = meta.capacityTib > 0 ? Math.round((meta.usedTib / meta.capacityTib) * 100) : 0

  const tierRowCss = css`
    display: grid;
    grid-template-columns: 1.6fr 1fr 1fr 1.2fr 1fr auto;
    gap: 12px;
    align-items: center;
    padding: 14px;
    border: 1px solid #e3e8ee;
    border-radius: 8px;
    cursor: pointer;
    background: ${tier.available
      ? 'var(--pf-t--global--background--color--primary--default)'
      : 'var(--pf-t--global--background--color--secondary--default)'};
    &:hover {
      background: var(--pf-t--global--background--color--secondary--default);
    }
  `

  const usageBarFillCss = css`
    width: ${usedPct}%;
    height: 100%;
    border-radius: 2px;
    background: ${usedPct > 80 ? '#c9190b' : '#0066cc'};
  `

  return (
    <div
      className={tierRowCss}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button, input, label')) return
        navigate(`/storage-tiers/${tier.id}`)
      }}
    >
      <div>
        <OcLink onClick={() => navigate(`/storage-tiers/${tier.id}`)}>{tier.name}</OcLink>{' '}
        <Label isCompact color={tier.available ? 'green' : 'grey'}>
          {tier.available ? 'available' : 'disabled'}
        </Label>{' '}
        {meta.isDefault && (
          <Label isCompact color="blue">
            default
          </Label>
        )}
        {tier.storageClassName && (
          <div className={tierMetaSubtextCss}>
            <code>{tier.storageClassName}</code>
          </div>
        )}
        {meta.description && <div className={tierMetaSubtextCss}>{meta.description}</div>}
      </div>

      <div>
        <div className={tierMetricLabelCss}>IOPS</div>
        <strong>{meta.iops}</strong>
      </div>

      <div>
        <div className={tierMetricLabelCss}>Latency</div>
        <strong>{meta.latency}</strong>
      </div>

      <div>
        <div className={tierMetricLabelCss}>Media</div>
        <div className={tierMetricValueCss}>{meta.media}</div>
      </div>

      <div>
        <div className={tierMetricLabelCss}>Used</div>
        <div className={tierMetricValueCss}>
          {meta.usedTib} / {meta.capacityTib} TiB
        </div>
        <div className={usageBarTrackCss}>
          <div className={usageBarFillCss} />
        </div>
      </div>

      <Switch
        id={`tier-avail-${tier.id}`}
        label="Available"
        isChecked={tier.available}
        onChange={(_e, v) => onToggle(tier, v)}
        aria-label={`Toggle availability for ${tier.name}`}
      />
    </div>
  )
}

const reviewSummaryCss = css`
  display: grid;
  gap: 6px;
  padding: 8px 0;
`

const reviewListCss = css`
  margin: 8px 0 0 18px;
  color: #5b6b7c;
  font-size: 13px;
`

const reviewFootnoteCss = css`
  margin-top: 10px;
  font-size: 12px;
  color: #5b6b7c;
`

// ── New tier wizard ────────────────────────────────────────────────────────────

function NewTierWizard({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [id, setId] = useState('titanium')
  const [name, setName] = useState('Titanium')
  const [qosClass, setQosClass] = useState('fast')
  const [vipPool, setVipPool] = useState('vip-pool-α')
  const [vastCluster, setVastCluster] = useState('vast-prod-α')
  const [protocol, setProtocol] = useState('NFSv4.1')
  const [reclaim, setReclaim] = useState('Retain')
  const [binding, setBinding] = useState('WaitForFirstConsumer')
  const [expand, setExpand] = useState(true)
  const [encryption, setEncryption] = useState('AES-256 + per-tenant KMS')
  const [replication, setReplication] = useState('sync')
  const [isDefault, setIsDefault] = useState(false)

  const scDefault = `tenant-{tenant}-${id}`

  return (
    <Modal
      variant={ModalVariant.large}
      isOpen={isOpen}
      onClose={onClose}
      aria-label="New storage tier"
    >
      <ModalHeader
        title="Create storage tier"
        description="Tier will be reconciled into TenantStorage CRs when a CaaS cluster reaches Ready."
      />
      <ModalBody>
        <Wizard height={540} onClose={onClose} onSave={onClose}>
          <WizardStep name="Identity" id="st-id">
            <Form>
              <FormGroup label="Tier ID" fieldId="tid" isRequired>
                <TextInput
                  id="tid"
                  value={id}
                  onChange={(_, v) => setId(v.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                />
              </FormGroup>
              <FormGroup label="Display name" fieldId="tn" isRequired>
                <TextInput id="tn" value={name} onChange={(_, v) => setName(v)} />
              </FormGroup>
              <FormGroup label="Description" fieldId="td">
                <TextArea
                  id="td"
                  rows={2}
                  defaultValue="Ultra-low-latency tier for HFT and real-time risk workloads."
                />
              </FormGroup>
              <FormGroup fieldId="tdef">
                <Checkbox
                  id="tdef"
                  label="Mark as default tier for new tenant clusters"
                  isChecked={isDefault}
                  onChange={(_, v) => setIsDefault(v)}
                />
              </FormGroup>
            </Form>
          </WizardStep>

          <WizardStep name="Performance" id="st-perf">
            <Form>
              <FormGroup label="Media" fieldId="tm">
                <FormSelect id="tm" value={qosClass} onChange={(_, v) => setQosClass(v)}>
                  {['NVMe SSD RAID-10', 'NVMe SSD', 'SATA SSD', 'HDD (SMR)'].map((x) => (
                    <FormSelectOption key={x} value={x} label={x} />
                  ))}
                </FormSelect>
              </FormGroup>
              <FormGroup label="Target IOPS" fieldId="ti">
                <TextInput id="ti" defaultValue="300k" />
              </FormGroup>
              <FormGroup label="Throughput (GB/s)" fieldId="tt">
                <TextInput id="tt" defaultValue="60" />
              </FormGroup>
              <FormGroup label="Latency SLO (ms)" fieldId="tl">
                <TextInput id="tl" defaultValue="0.15" />
              </FormGroup>
              <FormGroup label="Capacity (TiB)" fieldId="tc">
                <TextInput id="tc" defaultValue="80" />
              </FormGroup>
            </Form>
          </WizardStep>

          <WizardStep name="Backend" id="st-backend">
            <Form>
              <FormGroup label="VAST cluster" fieldId="vc">
                <FormSelect id="vc" value={vastCluster} onChange={(_, v) => setVastCluster(v)}>
                  {['vast-prod-α', 'vast-prod-β', 'vast-archive-γ'].map((x) => (
                    <FormSelectOption key={x} value={x} label={x} />
                  ))}
                </FormSelect>
              </FormGroup>
              <FormGroup label="VIP Pool" fieldId="vip">
                <TextInput id="vip" value={vipPool} onChange={(_, v) => setVipPool(v)} />
              </FormGroup>
              <FormGroup label="View path prefix" fieldId="vp">
                <TextInput id="vp" defaultValue={`/tenants/{tenant}/${id}`} />
              </FormGroup>
              <FormGroup label="Protocol" fieldId="vproto">
                <FormSelect id="vproto" value={protocol} onChange={(_, v) => setProtocol(v)}>
                  {['NFSv4.1', 'NFSv3', 'S3'].map((x) => (
                    <FormSelectOption key={x} value={x} label={x} />
                  ))}
                </FormSelect>
              </FormGroup>
            </Form>
          </WizardStep>

          <WizardStep name="CSI / Kubernetes" id="st-csi">
            <Form>
              <FormGroup label="CSI driver" fieldId="cd">
                <TextInput id="cd" defaultValue="csi.vastdata.com" />
              </FormGroup>
              <FormGroup label="StorageClass name" fieldId="sct">
                <TextInput id="sct" defaultValue={scDefault} />
              </FormGroup>
              <FormGroup label="Reclaim policy" fieldId="rp">
                <FormSelect id="rp" value={reclaim} onChange={(_, v) => setReclaim(v)}>
                  {['Delete', 'Retain'].map((x) => (
                    <FormSelectOption key={x} value={x} label={x} />
                  ))}
                </FormSelect>
              </FormGroup>
              <FormGroup label="Volume binding mode" fieldId="vbm">
                <FormSelect id="vbm" value={binding} onChange={(_, v) => setBinding(v)}>
                  {['Immediate', 'WaitForFirstConsumer'].map((x) => (
                    <FormSelectOption key={x} value={x} label={x} />
                  ))}
                </FormSelect>
              </FormGroup>
              <FormGroup fieldId="ave">
                <Checkbox
                  id="ave"
                  label="Allow volume expansion"
                  isChecked={expand}
                  onChange={(_, v) => setExpand(v)}
                />
              </FormGroup>
            </Form>
          </WizardStep>

          <WizardStep name="Governance" id="st-gov">
            <Form>
              <FormGroup label="Encryption" fieldId="enc">
                <FormSelect id="enc" value={encryption} onChange={(_, v) => setEncryption(v)}>
                  {['AES-256 at rest', 'AES-256 + per-tenant KMS'].map((x) => (
                    <FormSelectOption key={x} value={x} label={x} />
                  ))}
                </FormSelect>
              </FormGroup>
              <FormGroup label="Replication" fieldId="rep">
                <FormSelect id="rep" value={replication} onChange={(_, v) => setReplication(v)}>
                  {['none', 'async', 'sync'].map((x) => (
                    <FormSelectOption key={x} value={x} label={x} />
                  ))}
                </FormSelect>
              </FormGroup>
            </Form>
          </WizardStep>

          <WizardStep name="Review" id="st-review" footer={{ nextButtonText: 'Create tier' }}>
            <div className={reviewSummaryCss}>
              <div>
                <strong>
                  {name} ({id})
                </strong>{' '}
                {isDefault && (
                  <Label isCompact color="blue">
                    default
                  </Label>
                )}
              </div>
              <ul className={reviewListCss}>
                <li>
                  Media: {qosClass} · replication {replication}
                </li>
                <li>
                  Backend: {vastCluster} · {protocol} · VIP pool {vipPool}
                </li>
                <li>
                  StorageClass: {scDefault} · reclaim {reclaim} · binding {binding}
                  {expand ? ' · expandable' : ''}
                </li>
                <li>Encryption: {encryption}</li>
              </ul>
              <div className={reviewFootnoteCss}>
                Tier will be reconciled into <code>TenantStorage</code> CRs the next time a CaaS
                cluster reaches <code>ClusterOrderPhaseReady</code>.
              </div>
            </div>
          </WizardStep>
        </Wizard>
      </ModalBody>
    </Modal>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function StorageTiersPage() {
  const { data: tiers, isLoading } = useStorageTiers()
  const { mutate: patchTier } = usePatchStorageTier()
  const [wizardOpen, setWizardOpen] = useState(false)

  function handleToggle(tier: StorageTier, available: boolean) {
    patchTier({ id: tier.id, patch: { available } })
  }

  return (
    <PageSection isFilled>
      <PageHeader
        title="Storage Tiers"
        description="Define and govern sovereign-cloud storage classes."
        actions={
          <Button variant="primary" icon={<PlusCircleIcon />} onClick={() => setWizardOpen(true)}>
            New tier
          </Button>
        }
      />

      {isLoading ? (
        <Spinner aria-label="Loading storage tiers" />
      ) : (
        <div className={tiersPanelCss}>
          {(tiers ?? []).map((t) => (
            <TierRow key={t.id} tier={t} onToggle={handleToggle} />
          ))}
        </div>
      )}

      <NewTierWizard isOpen={wizardOpen} onClose={() => setWizardOpen(false)} />
    </PageSection>
  )
}
