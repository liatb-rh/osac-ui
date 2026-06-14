/**
 * flow: provider-administration
 * step: pad_storage_backends
 * route: /resources/storage/storage-backends
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { css } from '@emotion/css'
import {
  Button,
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
  TextInput,
  Wizard,
  WizardStep,
} from '@patternfly/react-core'
import { PlusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon'
import { CustomTableLink } from '@osac/ui-components'
import { PageHeader } from '@osac/ui-components'
import type { StorageBackend, StorageDeploymentModel } from '@osac/api-contracts'
import { useCreateStorageBackend, useStorageBackends } from '../../../hooks/useAgents'

// ── Styles ───────────────────────────────────────────────────────────────────

const tableCss = css`
  width: 100%;
  border-collapse: collapse;
  font-size: var(--pf-v5-global--FontSize--sm);

  th {
    text-align: left;
    padding: 8px 12px;
    font-weight: var(--pf-v5-global--FontWeight--semi-bold);
    border-bottom: 2px solid var(--pf-v5-global--BorderColor--100);
    color: var(--pf-v5-global--Color--200);
  }

  td {
    padding: 8px 12px;
    border-bottom: 1px solid var(--pf-v5-global--BorderColor--100);
    vertical-align: middle;
  }
`

const DEPLOYMENT_LABELS: Record<string, string> = {
  ova: 'OVA',
  'voc-aws': 'VoC / AWS',
  moc: 'MOC',
}

// ── Register wizard ──────────────────────────────────────────────────────────

interface RegisterState {
  name: string
  provider: string
  deploymentModel: StorageDeploymentModel | ''
  endpoint: string
  credentialsSecretRef: string
  vipPool: string
}

const INITIAL_STATE: RegisterState = {
  name: '',
  provider: 'vast',
  deploymentModel: '',
  endpoint: '',
  credentialsSecretRef: '',
  vipPool: '',
}

function RegisterBackendWizard({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [state, setState] = useState<RegisterState>(INITIAL_STATE)
  const createMutation = useCreateStorageBackend()

  function set<K extends keyof RegisterState>(key: K, val: RegisterState[K]) {
    setState((s) => ({ ...s, [key]: val }))
  }

  async function handleSave() {
    if (!state.name || !state.endpoint || !state.credentialsSecretRef || !state.vipPool) return
    await createMutation.mutateAsync({
      name: state.name,
      provider: 'vast',
      deploymentModel: state.deploymentModel || undefined,
      endpoint: state.endpoint,
      credentialsSecretRef: state.credentialsSecretRef,
      vipPool: state.vipPool,
    })
    setState(INITIAL_STATE)
    onClose()
  }

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={isOpen}
      onClose={onClose}
      aria-label="Register storage backend"
    >
      <ModalHeader
        title="Register storage backend"
        description="Connect a VAST cluster to OSAC as a StorageBackend. Storage tiers can then reference this backend."
      />
      <ModalBody>
        <Wizard
          height={460}
          onClose={onClose}
          onSave={() => { void handleSave() }}
        >
          <WizardStep name="Connection" id="sb-conn">
            <Form>
              <FormGroup label="Backend name" fieldId="sb-name" isRequired>
                <TextInput
                  id="sb-name"
                  value={state.name}
                  onChange={(_, v) => set('name', v.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="vast-prod-alpha"
                />
              </FormGroup>
              <FormGroup label="Deployment model" fieldId="sb-model">
                <FormSelect
                  id="sb-model"
                  value={state.deploymentModel}
                  onChange={(_, v) => set('deploymentModel', v as StorageDeploymentModel)}
                >
                  <FormSelectOption value="" label="— Select —" />
                  <FormSelectOption value="ova" label="OVA (Virtual Appliance)" />
                  <FormSelectOption value="voc-aws" label="VoC on AWS" />
                  <FormSelectOption value="moc" label="MOC (Mass Open Cloud)" />
                </FormSelect>
              </FormGroup>
              <FormGroup label="VMS endpoint" fieldId="sb-endpoint" isRequired>
                <TextInput
                  id="sb-endpoint"
                  value={state.endpoint}
                  onChange={(_, v) => set('endpoint', v)}
                  placeholder="https://vast-vms.infra.example.com"
                />
              </FormGroup>
              <FormGroup
                label="Credentials secret name"
                fieldId="sb-secret"
                isRequired
                helperText="Name of the Secret in osac-system that holds admin credentials."
              >
                <TextInput
                  id="sb-secret"
                  value={state.credentialsSecretRef}
                  onChange={(_, v) => set('credentialsSecretRef', v)}
                  placeholder="vast-admin-alpha"
                />
              </FormGroup>
            </Form>
          </WizardStep>

          <WizardStep name="VIP Pool" id="sb-vip">
            <Form>
              <FormGroup label="VIP pool name" fieldId="sb-vip" isRequired>
                <TextInput
                  id="sb-vip"
                  value={state.vipPool}
                  onChange={(_, v) => set('vipPool', v)}
                  placeholder="vip-pool-main"
                />
              </FormGroup>
            </Form>
          </WizardStep>

          <WizardStep
            name="Review"
            id="sb-review"
            footer={{ nextButtonText: 'Register backend' }}
          >
            <dl style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '8px 16px', fontSize: 'var(--pf-v5-global--FontSize--sm)' }}>
              <dt style={{ fontWeight: 'bold' }}>Name</dt>
              <dd>{state.name || '—'}</dd>
              <dt style={{ fontWeight: 'bold' }}>Deployment model</dt>
              <dd>{state.deploymentModel ? DEPLOYMENT_LABELS[state.deploymentModel] : '—'}</dd>
              <dt style={{ fontWeight: 'bold' }}>Endpoint</dt>
              <dd>{state.endpoint || '—'}</dd>
              <dt style={{ fontWeight: 'bold' }}>Credentials secret</dt>
              <dd>{state.credentialsSecretRef || '—'}</dd>
              <dt style={{ fontWeight: 'bold' }}>VIP pool</dt>
              <dd>{state.vipPool || '—'}</dd>
            </dl>
          </WizardStep>
        </Wizard>
      </ModalBody>
    </Modal>
  )
}

// ── Row ──────────────────────────────────────────────────────────────────────

function BackendRow({ backend }: { backend: StorageBackend }) {
  const navigate = useNavigate()
  const ready = backend.status?.ready ?? false
  const model = backend.deploymentModel ? DEPLOYMENT_LABELS[backend.deploymentModel] ?? backend.deploymentModel : '—'
  return (
    <tr>
      <td>
        <CustomTableLink onClick={() => navigate(`/resources/storage/storage-backends/${backend.id}`)}>
          {backend.metadata.name}
        </CustomTableLink>
      </td>
      <td><Label color="blue" isCompact>{backend.provider}</Label></td>
      <td>{model}</td>
      <td style={{ fontFamily: 'monospace', fontSize: '0.8em' }}>{backend.endpoint}</td>
      <td>{backend.vipPool}</td>
      <td>
        <Label color={ready ? 'green' : 'red'} isCompact>
          {ready ? 'Ready' : 'Degraded'}
        </Label>
      </td>
    </tr>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function StorageBackendsPage() {
  const [wizardOpen, setWizardOpen] = useState(false)
  const { data: backends, isLoading, isError } = useStorageBackends()

  return (
    <>
      <PageHeader
        title="Storage Backends"
        subtitle="Registered VAST clusters. Storage tiers reference a backend by ID."
        actions={
          <Button
            variant="primary"
            icon={<PlusCircleIcon />}
            onClick={() => setWizardOpen(true)}
          >
            Register backend
          </Button>
        }
      />
      <PageSection>
        {isLoading && <Spinner aria-label="Loading storage backends" />}
        {isError && (
          <p style={{ color: 'var(--pf-v5-global--danger-color--100)' }}>
            Failed to load storage backends.
          </p>
        )}
        {backends && (
          <table className={tableCss}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Provider</th>
                <th>Deployment model</th>
                <th>Endpoint</th>
                <th>VIP pool</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {backends.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ color: 'var(--pf-v5-global--Color--200)', textAlign: 'center', padding: 32 }}>
                    No storage backends registered yet.
                  </td>
                </tr>
              ) : (
                backends.map((b) => <BackendRow key={b.id} backend={b} />)
              )}
            </tbody>
          </table>
        )}
      </PageSection>
      <RegisterBackendWizard isOpen={wizardOpen} onClose={() => setWizardOpen(false)} />
    </>
  )
}
