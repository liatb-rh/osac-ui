/**
 * flow: provider-administration
 * step: pad_infrastructure_agents
 * route: /provider/agents
 */
import { css } from '@emotion/css'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  Checkbox,
  ClipboardCopy,
  ClipboardCopyVariant,
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
  TextArea,
  TextInput,
  Wizard,
  WizardStep,
} from '@patternfly/react-core'
import { ActionsColumn } from '@patternfly/react-table'
import { PlusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon'
import type { Agent, AgentState } from '@osac/api-contracts'
import { OcLink, OcTable } from '@osac/ui-components'
import type { OcTableColumn } from '@osac/ui-components'
import { useAgents, useDeprovisionAgent, useProvisionAgent } from '../../hooks/useAgents'
import { PageHeader } from '../../components/layout'

// ── Status config ─────────────────────────────────────────────────────────────

const reviewGridCss = css`
  display: grid;
  gap: 12px;
`

const summaryCardPaddingCss = css`
  padding: 14px 16px;
`

const summaryListCss = css`
  margin: 8px 0 0 18px;
  color: var(--pf-t--global--text--color--subtle);
`

const enrollLabelCss = css`
  font-weight: 600;
  margin-bottom: 6px;
`

const subtleTextCss = css`
  color: var(--pf-t--global--text--color--subtle);
`

const STATE_TONE: Record<AgentState, 'green' | 'blue' | 'yellow' | 'red' | 'grey'> = {
  AGENT_STATE_AVAILABLE: 'green',
  AGENT_STATE_PROVISIONING: 'blue',
  AGENT_STATE_PROVISIONED: 'grey',
  AGENT_STATE_DEPROVISIONING: 'yellow',
  AGENT_STATE_UNAVAILABLE: 'red',
}

const STATE_LABEL: Record<AgentState, string> = {
  AGENT_STATE_AVAILABLE: 'available',
  AGENT_STATE_PROVISIONING: 'provisioning',
  AGENT_STATE_PROVISIONED: 'provisioned',
  AGENT_STATE_DEPROVISIONING: 'deprovisioning',
  AGENT_STATE_UNAVAILABLE: 'unreachable',
}

function AgentStatusLabel({ state }: { state: AgentState }) {
  return (
    <Label
      isCompact
      color={STATE_TONE[state] ?? 'grey'}
      icon={
        state === 'AGENT_STATE_PROVISIONING' || state === 'AGENT_STATE_DEPROVISIONING' ? (
          <Spinner size="sm" aria-label={STATE_LABEL[state]} />
        ) : undefined
      }
    >
      {STATE_LABEL[state] ?? state}
    </Label>
  )
}

function shortProfile(profile: string | undefined): string {
  if (!profile) return '—'
  const m = profile.match(/baremetal-([^-]+)-(\d+c)-(\d+g)(?:-(.+))?/)
  if (m)
    return `${m[1]} · ${m[2].toUpperCase()} / ${m[3].toUpperCase()}${m[4] ? ` · ${m[4].toUpperCase()}` : ''}`
  return profile
}

// ── Provision agent wizard ────────────────────────────────────────────────────

function ProvisionAgentWizard({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [hostname, setHostname] = useState('rack-δ-07')
  const [az, setAz] = useState('AZ-α')
  const [hostType, setHostType] = useState('baremetal-standard-48c-192g')
  const [vnet, setVnet] = useState('vn-prod')
  const [channel, setChannel] = useState('stable')
  const [autoJoin, setAutoJoin] = useState(true)
  const [cluster, setCluster] = useState('prod-ocp')
  const [sshKey, setSshKey] = useState('ssh-ed25519 AAAA... ops@northstar')

  const enrollCmd = `curl -sSL https://osac.northstar/agent/install.sh | sudo bash -s -- \\
  --hostname ${hostname} --az ${az} --host-type ${hostType} \\
  --vnet ${vnet} --channel ${channel} \\
  --enroll-token $(osac-cli agents new-token)`

  return (
    <Modal
      variant={ModalVariant.large}
      isOpen={isOpen}
      onClose={onClose}
      aria-label="Provision agent"
    >
      <ModalHeader
        title="Provision infrastructure agent"
        description="Enroll a new physical host into the sovereign-edge fleet."
      />
      <ModalBody>
        <Wizard height={520} onClose={onClose} onSave={onClose}>
          <WizardStep name="Identity" id="ag-id">
            <Form>
              <FormGroup label="Hostname" fieldId="h" isRequired>
                <TextInput id="h" value={hostname} onChange={(_, v) => setHostname(v)} />
              </FormGroup>
              <FormGroup label="Availability zone" fieldId="az">
                <FormSelect id="az" value={az} onChange={(_, v) => setAz(v)}>
                  {['AZ-α', 'AZ-β', 'AZ-γ'].map((z) => (
                    <FormSelectOption key={z} value={z} label={z} />
                  ))}
                </FormSelect>
              </FormGroup>
              <FormGroup label="Host type" fieldId="ht">
                <FormSelect id="ht" value={hostType} onChange={(_, v) => setHostType(v)}>
                  {[
                    { id: 'baremetal-standard-48c-192g', label: 'Standard (48c / 192G)' },
                    { id: 'baremetal-high-64c-1024g', label: 'High memory (64c / 1024G)' },
                    { id: 'baremetal-gpu-96c-1024g-h100', label: 'GPU (96c / 1024G · H100)' },
                  ].map((h) => (
                    <FormSelectOption key={h.id} value={h.id} label={h.label} />
                  ))}
                </FormSelect>
              </FormGroup>
            </Form>
          </WizardStep>

          <WizardStep name="Networking" id="ag-net">
            <Form>
              <FormGroup label="Virtual network" fieldId="vn">
                <FormSelect id="vn" value={vnet} onChange={(_, v) => setVnet(v)}>
                  {['vn-prod', 'vn-dev', 'vn-mgmt'].map((n) => (
                    <FormSelectOption key={n} value={n} label={n} />
                  ))}
                </FormSelect>
              </FormGroup>
              <FormGroup label="Management interface" fieldId="mi">
                <TextInput id="mi" defaultValue="eno1" />
              </FormGroup>
              <FormGroup label="Data interface" fieldId="di">
                <TextInput id="di" defaultValue="eno2" />
              </FormGroup>
              <FormGroup label="MTU" fieldId="mtu">
                <TextInput id="mtu" defaultValue="9000" />
              </FormGroup>
            </Form>
          </WizardStep>

          <WizardStep name="Cluster join" id="ag-cluster">
            <Form>
              <FormGroup fieldId="aj">
                <Checkbox
                  id="aj"
                  label="Auto-join a cluster after enrollment"
                  isChecked={autoJoin}
                  onChange={(_, v) => setAutoJoin(v)}
                />
              </FormGroup>
              {autoJoin && (
                <FormGroup label="Target cluster" fieldId="cl">
                  <FormSelect id="cl" value={cluster} onChange={(_, v) => setCluster(v)}>
                    {['prod-ocp', 'stg-ocp', 'dev-ocp'].map((c) => (
                      <FormSelectOption key={c} value={c} label={c} />
                    ))}
                  </FormSelect>
                </FormGroup>
              )}
              <FormGroup label="Release channel" fieldId="ch">
                <FormSelect id="ch" value={channel} onChange={(_, v) => setChannel(v)}>
                  {['stable', 'candidate', 'edge'].map((c) => (
                    <FormSelectOption key={c} value={c} label={c} />
                  ))}
                </FormSelect>
              </FormGroup>
            </Form>
          </WizardStep>

          <WizardStep name="Trust" id="ag-trust">
            <Form>
              <FormGroup label="SSH public key" fieldId="ssh">
                <TextArea id="ssh" rows={3} value={sshKey} onChange={(_, v) => setSshKey(v)} />
              </FormGroup>
              <FormGroup label="Enrollment token TTL" fieldId="ttl">
                <TextInput id="ttl" defaultValue="30m" />
              </FormGroup>
            </Form>
          </WizardStep>

          <WizardStep name="Review & enroll" id="ag-review">
            <div className={reviewGridCss}>
              <Card>
                <div className={summaryCardPaddingCss}>
                  <strong>Summary</strong>
                  <ul className={summaryListCss}>
                    <li>
                      {hostname} · {az} · <code>{shortProfile(hostType)}</code>
                    </li>
                    <li>
                      Network: {vnet} · Channel: {channel}
                    </li>
                    <li>{autoJoin ? `Auto-join cluster ${cluster}` : 'Manual cluster join'}</li>
                  </ul>
                </div>
              </Card>
              <div>
                <div className={enrollLabelCss}>Run on the target host</div>
                <ClipboardCopy
                  isCode
                  hoverTip="Copy"
                  clickTip="Copied"
                  variant={ClipboardCopyVariant.expansion}
                >
                  {enrollCmd}
                </ClipboardCopy>
              </div>
            </div>
          </WizardStep>
        </Wizard>
      </ModalBody>
    </Modal>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function InfrastructureAgentsPage() {
  const navigate = useNavigate()
  const { data: agents, isLoading } = useAgents()
  const { mutate: _provision } = useProvisionAgent()
  const { mutate: deprovision } = useDeprovisionAgent()
  const [wizardOpen, setWizardOpen] = useState(false)

  const allAgents = agents ?? []

  function rowActions(a: Agent) {
    return [
      { title: 'Upgrade agent', onClick: () => {} },
      { title: 'Cordon', onClick: () => {} },
      { isSeparator: true },
      {
        title: 'Deprovision',
        onClick: () => deprovision(a.id),
        isDisabled: a.state !== 'AGENT_STATE_PROVISIONED',
      },
    ]
  }

  const columns: OcTableColumn<Agent>[] = [
    {
      label: 'Hostname',
      render: (a) => (
        <OcLink onClick={() => navigate(`/agents/${a.id}`)}>{a.metadata?.name ?? a.id}</OcLink>
      ),
    },
    {
      label: 'Host type',
      render: (a) => <code>{shortProfile(a.hardwareProfile)}</code>,
    },
    {
      label: 'Cluster',
      render: (a) => a.clusterRef ?? <span className={subtleTextCss}>—</span>,
    },
    {
      label: 'Inventory backend',
      render: (a) => a.inventoryBackend ?? <span className={subtleTextCss}>—</span>,
    },
    {
      label: 'Status',
      render: (a) => <AgentStatusLabel state={a.state} />,
    },
    {
      screenReaderText: 'Actions',
      isActionCell: true,
      render: (a) => <ActionsColumn items={rowActions(a)} />,
    },
  ]

  return (
    <PageSection isFilled>
      <PageHeader
        title="Infrastructure Agents"
        description="Sovereign edge agent fleet and lifecycle."
        actions={
          <Button variant="primary" icon={<PlusCircleIcon />} onClick={() => setWizardOpen(true)}>
            Provision agent
          </Button>
        }
      />

      {isLoading ? (
        <Spinner aria-label="Loading agents" />
      ) : (
        <OcTable
          ariaLabel="Infrastructure agents"
          columns={columns}
          rows={allAgents}
          getRowKey={(a) => a.id}
          onRowClick={(a) => navigate(`/agents/${a.id}`)}
        />
      )}

      <ProvisionAgentWizard isOpen={wizardOpen} onClose={() => setWizardOpen(false)} />
    </PageSection>
  )
}
