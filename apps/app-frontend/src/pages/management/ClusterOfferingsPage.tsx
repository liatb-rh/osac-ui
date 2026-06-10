/**
 * flow: tenant-administration | provider-administration
 * step: tad_cluster_offerings | pad_cluster_offerings
 * route: /provider/cluster-offerings (providerAdmin)
 */
import { css } from '@emotion/css'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Button,
  Checkbox,
  Form,
  FormGroup,
  Modal,
  ModalBody,
  ModalHeader,
  NumberInput,
  PageSection,
  Radio,
  Spinner,
  TextArea,
  TextInput,
  Wizard,
  WizardStep,
} from '@patternfly/react-core'
import { PlusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon'
import type { ClusterCatalogItem } from '@osac/api-contracts'
import { ToggleCard } from '@osac/ui-components'
import { useClusterCatalogItems } from '../../hooks/useClusterCatalogItems'
import { PageHeader } from '@osac/ui-components'

const alertSpacingCss = css`
  margin-bottom: var(--pf-t--global--spacer--md);
`

const offeringsPanelCss = css`
  background: var(--pf-t--global--background--color--primary--default);
  border: 1px solid var(--pf-t--global--border--color--default);
  border-radius: var(--pf-t--global--border--radius--medium);
  padding: 20px;
  display: grid;
  gap: 12px;
`

const modalBodyCss = css`
  min-height: 480px;
`

const reviewGridCss = css`
  display: grid;
  gap: 6px;
  padding: 8px 0;
`

const reviewFootnoteCss = css`
  color: #5b6b7c;
  font-size: 12px;
  margin-top: 8px;
`

export interface ClusterOfferingsPageProps {
  role?: 'tenantAdmin' | 'providerAdmin'
}

export function ClusterOfferingsPage({ role = 'providerAdmin' }: ClusterOfferingsPageProps) {
  const navigate = useNavigate()
  const isProvider = role === 'providerAdmin'
  const {
    data: items,
    isLoading,
    error,
  } = useClusterCatalogItems({ includeUnpublished: isProvider })

  const [enabled, setEnabled] = useState<Record<string, boolean>>({})
  const [wizardOpen, setWizardOpen] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)

  function isActive(item: ClusterCatalogItem): boolean {
    return enabled[item.id] !== undefined ? enabled[item.id] : (item.published ?? true)
  }

  function flash(msg: string) {
    setSaveSuccess(msg)
    setTimeout(() => setSaveSuccess(null), 4000)
  }

  function handleToggle(item: ClusterCatalogItem, checked: boolean) {
    setEnabled((p) => ({ ...p, [item.id]: checked }))
    flash(`"${item.title}" ${checked ? 'enabled' : 'disabled'}.`)
  }

  return (
    <PageSection isFilled>
      <PageHeader
        title="Cluster Offerings"
        description="Enable or disable cluster catalog items for users in your organization."
        actions={
          <Button variant="primary" icon={<PlusCircleIcon />} onClick={() => setWizardOpen(true)}>
            New offering
          </Button>
        }
      />

      {saveSuccess && (
        <Alert variant="success" title={saveSuccess} isInline className={alertSpacingCss} />
      )}

      {error && (
        <Alert
          variant="danger"
          title="Failed to load cluster offerings"
          isInline
          className={alertSpacingCss}
        />
      )}

      {isLoading ? (
        <Spinner aria-label="Loading cluster offerings" />
      ) : (
        <div className={offeringsPanelCss}>
          {(items ?? []).map((item) => {
            const versions = item.allowedVersions ?? []
            const isPreview = versions.some((v) => v.includes('preview'))
            const active = isActive(item)
            return (
              <ToggleCard
                key={item.id}
                switchId={`toggle-${item.id}`}
                title={item.title}
                labels={[
                  { text: isPreview ? 'preview' : 'stable', color: isPreview ? 'orange' : 'green' },
                  ...(!active ? [{ text: 'disabled', color: 'grey' as const }] : []),
                ]}
                description={item.description}
                chips={versions.map((v) => ({ key: v, text: v, color: 'blue' as const }))}
                isActive={active}
                onToggle={(v) => handleToggle(item, v)}
                onAction={() => navigate(`/cluster-offerings/${item.id}`)}
              />
            )
          })}
        </div>
      )}

      <Modal
        variant="large"
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        aria-label="New cluster offering"
      >
        <ModalHeader
          title="New cluster offering"
          description="Publish a new cluster catalog item available to tenants in your organization."
        />
        <ModalBody className={modalBodyCss}>
          <NewOfferingWizard
            onCancel={() => setWizardOpen(false)}
            onSave={() => {
              setWizardOpen(false)
              flash('Offering created (demo — not persisted in mock mode).')
            }}
          />
        </ModalBody>
      </Modal>
    </PageSection>
  )
}

// ── New offering wizard ────────────────────────────────────────────────────────

function NewOfferingWizard({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  const [name, setName] = useState('OpenShift 4.17 — Edge')
  const [desc, setDesc] = useState('Lightweight OCP profile for edge and branch sites.')
  const [ocp, setOcp] = useState('4.17.3')
  const [risk, setRisk] = useState<'stable' | 'preview'>('stable')
  const [minNodes, setMinNodes] = useState(3)
  const [gpu, setGpu] = useState(false)
  const [multiZone, setMultiZone] = useState(true)

  return (
    <Wizard onClose={onCancel} onSave={onSave} height={460}>
      <WizardStep name="Identity" id="ident">
        <Form>
          <FormGroup label="Offering name" isRequired fieldId="off-name">
            <TextInput id="off-name" value={name} onChange={(_e, v) => setName(v)} />
          </FormGroup>
          <FormGroup label="Description" fieldId="off-desc">
            <TextArea id="off-desc" value={desc} onChange={(_e, v) => setDesc(v)} rows={3} />
          </FormGroup>
          <FormGroup label="OCP version" fieldId="off-ocp">
            <TextInput id="off-ocp" value={ocp} onChange={(_e, v) => setOcp(v)} />
          </FormGroup>
        </Form>
      </WizardStep>

      <WizardStep name="Risk tier" id="risk">
        <Form>
          <FormGroup label="Maturity" fieldId="off-risk" role="radiogroup">
            <Radio
              id="r-stable"
              name="risk"
              label="Stable — GA, production-ready"
              isChecked={risk === 'stable'}
              onChange={() => setRisk('stable')}
            />
            <Radio
              id="r-preview"
              name="risk"
              label="Preview — early access, no SLA"
              isChecked={risk === 'preview'}
              onChange={() => setRisk('preview')}
            />
          </FormGroup>
        </Form>
      </WizardStep>

      <WizardStep name="Topology" id="topo">
        <Form>
          <FormGroup label="Minimum worker nodes" fieldId="off-min">
            <NumberInput
              id="off-min"
              value={minNodes}
              min={1}
              max={50}
              onMinus={() => setMinNodes((n) => Math.max(1, n - 1))}
              onPlus={() => setMinNodes((n) => n + 1)}
              onChange={(e) => setMinNodes(Number((e.target as HTMLInputElement).value) || 1)}
            />
          </FormGroup>
          <FormGroup fieldId="off-mz">
            <Checkbox
              id="off-mz"
              label="Spread control plane across availability zones"
              isChecked={multiZone}
              onChange={(_e, v) => setMultiZone(v)}
            />
          </FormGroup>
          <FormGroup fieldId="off-gpu">
            <Checkbox
              id="off-gpu"
              label="GPU enabled (NVIDIA operator)"
              isChecked={gpu}
              onChange={(_e, v) => setGpu(v)}
            />
          </FormGroup>
        </Form>
      </WizardStep>

      <WizardStep name="Review" id="rev" footer={{ nextButtonText: 'Publish offering' }}>
        <div className={reviewGridCss}>
          <div>
            <strong>Name:</strong> {name}
          </div>
          <div>
            <strong>OCP version:</strong> {ocp}
          </div>
          <div>
            <strong>Maturity:</strong> {risk}
          </div>
          <div>
            <strong>Min nodes:</strong> {minNodes}
            {multiZone ? ' · multi-AZ control plane' : ''}
          </div>
          <div>
            <strong>GPU:</strong> {gpu ? 'enabled' : 'disabled'}
          </div>
          <div className={reviewFootnoteCss}>
            This offering will be available to tenants once enabled in the list.
          </div>
        </div>
      </WizardStep>
    </Wizard>
  )
}
