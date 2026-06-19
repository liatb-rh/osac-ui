/**
 * flow: provider-administration
 * step: pad_storage_backends
 * route: /resources/storage/storage-backends
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  TextInput,
  Wizard,
  WizardStep,
} from '@patternfly/react-core'
import { PlusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon'
import { CustomTableLink, ObjectsTable, PageLayout } from '@osac/ui-components'
import type { ObjectsTableColumn } from '@osac/ui-components'
import type { StorageBackend, StorageDeploymentModel } from '@osac/api-contracts'
import { useCreateStorageBackend, useStorageBackends } from '../../../hooks/useAgents'

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
          onSave={() => {
            void handleSave()
          }}
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
              <FormGroup label="Credentials secret name" fieldId="sb-secret" isRequired>
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

          <WizardStep name="Review" id="sb-review" footer={{ nextButtonText: 'Register backend' }}>
            <dl
              style={{
                display: 'grid',
                gridTemplateColumns: '160px 1fr',
                gap: '8px 16px',
                fontSize: 'var(--pf-v5-global--FontSize--sm)',
              }}
            >
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

// ── Page ─────────────────────────────────────────────────────────────────────

export function StorageBackendsPage() {
  const navigate = useNavigate()
  const [wizardOpen, setWizardOpen] = useState(false)
  const { data: backends, isLoading, isError } = useStorageBackends()

  const columns: ObjectsTableColumn<StorageBackend>[] = [
    {
      label: 'Name',
      dataLabel: 'Name',
      render: (b) => (
        <CustomTableLink onClick={() => navigate(`/resources/storage/storage-backends/${b.id}`)}>
          {b.metadata.name}
        </CustomTableLink>
      ),
    },
    {
      label: 'Provider',
      dataLabel: 'Provider',
      render: (b) => (
        <Label color="blue" isCompact>
          {b.provider}
        </Label>
      ),
    },
    {
      label: 'Deployment model',
      dataLabel: 'Deployment model',
      render: (b) =>
        b.deploymentModel ? (DEPLOYMENT_LABELS[b.deploymentModel] ?? b.deploymentModel) : '—',
    },
    {
      label: 'Endpoint',
      dataLabel: 'Endpoint',
      render: (b) => <code style={{ fontSize: '0.8em' }}>{b.endpoint}</code>,
    },
    {
      label: 'VIP pool',
      dataLabel: 'VIP pool',
      render: (b) => b.vipPool,
    },
    {
      label: 'Status',
      dataLabel: 'Status',
      render: (b) => {
        const ready = b.status?.ready ?? false
        return (
          <Label color={ready ? 'green' : 'red'} isCompact>
            {ready ? 'Ready' : 'Degraded'}
          </Label>
        )
      },
    },
  ]

  return (
    <PageLayout
      title="Storage Backends"
      description="Registered VAST clusters. Storage tiers reference a backend by ID."
      isLoading={isLoading}
      loadingLabel="Loading storage backends"
      error={isError ? 'Failed to load storage backends.' : null}
      actions={
        <Button variant="primary" icon={<PlusCircleIcon />} onClick={() => setWizardOpen(true)}>
          Register backend
        </Button>
      }
    >
      {backends && (
        <ObjectsTable
          ariaLabel="Storage backends"
          columns={columns}
          rows={backends}
          getRowKey={(b) => b.id}
          onRowClick={(b) => navigate(`/resources/storage/storage-backends/${b.id}`)}
          defaultPageSize={10}
        />
      )}
      <RegisterBackendWizard isOpen={wizardOpen} onClose={() => setWizardOpen(false)} />
    </PageLayout>
  )
}
