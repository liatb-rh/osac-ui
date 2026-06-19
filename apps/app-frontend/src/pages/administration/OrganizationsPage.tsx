/**
 * flow: manage-organizations
 * step: org_list
 * route: /provider/organizations (providerAdmin)
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Button,
  Checkbox,
  Form,
  FormGroup,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  PageSection,
  Select,
  SelectList,
  SelectOption,
  Switch,
  Tab,
  Tabs,
  TabTitleText,
  TextInput,
  MenuToggle,
} from '@patternfly/react-core'
import { ActionsColumn } from '@patternfly/react-table'
import { KeyIcon } from '@patternfly/react-icons/dist/esm/icons/key-icon'
import { PlusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon'
import { ShieldAltIcon } from '@patternfly/react-icons/dist/esm/icons/shield-alt-icon'
import { CustomTableLink, ObjectsTable, PageLayout } from '@osac/ui-components'
import type { ObjectsTableColumn } from '@osac/ui-components'
import {
  ORGANIZATIONS,
  orgStateToStatus,
  idpPhaseToStatus,
  type OrgFixture,
  type IdpKind,
} from '../../mocks/organizations-store'

// ---------------------------------------------------------------------------
// Status dot (reuse from existing codebase pattern)
// ---------------------------------------------------------------------------

function StatusDot({ status }: { status: 'ready' | 'progressing' | 'failed' }) {
  return <span className="osac-status-dot" data-s={status} />
}

// ---------------------------------------------------------------------------
// Organizations list tab
// ---------------------------------------------------------------------------

function OrgsTable({ orgs }: { orgs: OrgFixture[] }) {
  const navigate = useNavigate()

  const columns: ObjectsTableColumn<OrgFixture>[] = [
    {
      label: 'Organization',
      dataLabel: 'Organization',
      render: (o) => (
        <CustomTableLink onClick={() => navigate(`/provider/tenants/${o.tenant}`)}>
          {o.name}
        </CustomTableLink>
      ),
    },
    {
      label: 'Keycloak realm',
      dataLabel: 'Keycloak realm',
      render: (o) => <code style={{ fontSize: '0.8em' }}>{o.realm}</code>,
    },
    {
      label: 'IdP',
      dataLabel: 'IdP',
      render: (o) => (
        <Label isCompact color="blue">
          {o.idp.kind}
        </Label>
      ),
    },
    {
      label: 'IdP host',
      dataLabel: 'IdP host',
      render: (o) => <code style={{ fontSize: '0.8em' }}>{o.idp.host}</code>,
    },
    {
      label: 'Status',
      dataLabel: 'Status',
      render: (o) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <StatusDot status={orgStateToStatus(o.state)} />
          <span style={{ textTransform: 'capitalize', fontSize: '0.9em' }}>
            {o.state.toLowerCase()}
          </span>
        </span>
      ),
    },
    {
      label: 'Users',
      dataLabel: 'Users',
      render: (o) => o.users.length,
    },
    {
      label: 'Break-glass',
      dataLabel: 'Break-glass',
      render: (o) => o.break_glass.length,
    },
    {
      isActionCell: true,
      screenReaderText: 'Actions',
      render: () => (
        <ActionsColumn
          items={[
            { title: 'Test IdP connection' },
            { title: 'Rotate break-glass' },
            { title: 'View realm' },
            { isSeparator: true },
            { title: 'Disable' },
          ]}
        />
      ),
    },
  ]

  return (
    <div style={{ marginTop: 16 }}>
      <ObjectsTable
        ariaLabel="Organizations"
        columns={columns}
        rows={orgs}
        getRowKey={(o) => o.id}
        onRowClick={(o) => navigate(`/provider/tenants/${o.tenant}`)}
        defaultPageSize={10}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sovereign Gateway tab
// ---------------------------------------------------------------------------

function SovereignGatewayTab() {
  return (
    <div style={{ marginTop: 16, display: 'grid', gap: 16 }}>
      <Alert
        variant="info"
        isInline
        title="Sovereign Gateway Pattern is active"
      >
        Every API request is authenticated by Keycloak and authorized by Authorino through
        Kuadrant policies at the cluster edge.
      </Alert>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div
          style={{
            padding: 16,
            border: '1px solid var(--pf-t--global--border--color--default)',
            borderRadius: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <KeyIcon />
            <strong>Keycloak — token issuance</strong>
          </div>
          <div style={{ fontSize: 13, color: 'var(--pf-t--global--text--color--subtle)', display: 'grid', gap: 4 }}>
            <div>
              Issuer: <code>{'https://auth.osac.internal/realms/<tenant>'}</code>
            </div>
            <div>Algorithm: RS256 · JWKS cached 10m</div>
            <div>Federation: LDAP / AD / OIDC / SAML per realm</div>
          </div>
        </div>
        <div
          style={{
            padding: 16,
            border: '1px solid var(--pf-t--global--border--color--default)',
            borderRadius: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <ShieldAltIcon />
            <strong>Authorino — authorization</strong>
          </div>
          <div style={{ fontSize: 13, color: 'var(--pf-t--global--text--color--subtle)', display: 'grid', gap: 4 }}>
            <div>
              {ORGANIZATIONS.length * 3} AuthPolicies deployed across Kuadrant Gateways
            </div>
            <div>Group-claim mapped to OSAC roles</div>
            <div>Deny-by-default · explicit allow per route</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// IdP health tab
// ---------------------------------------------------------------------------

function IdpHealthTab({ orgs }: { orgs: OrgFixture[] }) {
  return (
    <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
      {orgs.map((o) => (
        <div
          key={o.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto auto auto',
            gap: 16,
            alignItems: 'center',
            padding: 12,
            border: '1px solid var(--pf-t--global--border--color--default)',
            borderRadius: 8,
          }}
        >
          <div>
            <strong>{o.name}</strong>
            <span style={{ color: 'var(--pf-t--global--text--color--subtle)', fontSize: 12 }}>
              {' '}· {o.idp.kind} · {o.idp.host}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--pf-t--global--text--color--subtle)' }}>
            last probe: {o.idp.status.last_probe}
          </div>
          <StatusDot status={idpPhaseToStatus(o.idp.status.phase)} />
          <Button variant="link" size="sm">
            Run health probe
          </Button>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Create org modal
// ---------------------------------------------------------------------------

const IDP_OPTIONS: IdpKind[] = ['OIDC', 'LDAP', 'SAML', 'AD']

function NewOrgModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [name, setName] = useState('Crestline Insurance')
  const [realm, setRealm] = useState('crestline.osac')
  const [idp, setIdp] = useState<IdpKind>('OIDC')
  const [idpOpen, setIdpOpen] = useState(false)
  const [host, setHost] = useState('auth.crestline.example')
  const [breakGlass, setBreakGlass] = useState(true)

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={isOpen}
      onClose={onClose}
      aria-label="Create organization"
    >
      <ModalHeader
        title="Create organization"
        description="Provisions a Keycloak realm and registers the external IdP."
      />
      <ModalBody>
        <Form>
          <FormGroup label="Organization name" isRequired fieldId="org-name">
            <TextInput
              id="org-name"
              value={name}
              onChange={(_, v) => setName(v)}
            />
          </FormGroup>
          <FormGroup label="Keycloak realm" isRequired fieldId="org-realm">
            <TextInput
              id="org-realm"
              value={realm}
              onChange={(_, v) => setRealm(v)}
            />
          </FormGroup>
          <FormGroup label="Identity provider" fieldId="org-idp">
            <Select
              isOpen={idpOpen}
              onOpenChange={setIdpOpen}
              toggle={(ref) => (
                <MenuToggle ref={ref} onClick={() => setIdpOpen((v) => !v)} isExpanded={idpOpen}>
                  {idp}
                </MenuToggle>
              )}
              selected={idp}
              onSelect={(_, v) => {
                setIdp(v as IdpKind)
                setIdpOpen(false)
              }}
            >
              <SelectList>
                {IDP_OPTIONS.map((o) => (
                  <SelectOption key={o} value={o}>
                    {o}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
          </FormGroup>
          <FormGroup label="IdP endpoint / host" fieldId="org-host">
            <TextInput
              id="org-host"
              value={host}
              onChange={(_, v) => setHost(v)}
            />
          </FormGroup>
          <FormGroup fieldId="org-bg">
            <Switch
              id="org-bg"
              label="Provision 2 break-glass accounts (recommended)"
              isChecked={breakGlass}
              onChange={(_, v) => setBreakGlass(v)}
            />
          </FormGroup>
          <Alert
            variant="info"
            isInline
            isPlain
            title="Authorino AuthPolicies will be generated automatically for the new realm."
          />
          <Checkbox
            id="org-dummy"
            label={`Issuer: https://auth.osac.internal/realms/${realm || '<realm>'}`}
            isChecked
            isDisabled
            style={{ fontSize: 12 }}
          />
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={onClose} isDisabled={!name || !realm || !host}>
          Create organization
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function OrganizationsPage() {
  const [activeTab, setActiveTab] = useState<string | number>('orgs')
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <PageSection isFilled>
      <PageLayout
        title="Organizations"
        description="Keycloak realms, external identity providers, and the Sovereign Gateway Pattern (Authorino + Kuadrant)."
        actions={
          <Button
            variant="primary"
            icon={<PlusCircleIcon />}
            onClick={() => setCreateOpen(true)}
          >
            New organization
          </Button>
        }
      >

        <div style={{ marginTop: 24 }}>
          <Tabs
            activeKey={activeTab}
            onSelect={(_e, k) => setActiveTab(k)}
            aria-label="Organizations tabs"
          >
            <Tab eventKey="orgs" title={<TabTitleText>Organizations</TabTitleText>}>
              <OrgsTable orgs={ORGANIZATIONS} />
            </Tab>
            <Tab eventKey="gateway" title={<TabTitleText>Sovereign Gateway</TabTitleText>}>
              <SovereignGatewayTab />
            </Tab>
            <Tab eventKey="health" title={<TabTitleText>IdP health</TabTitleText>}>
              <IdpHealthTab orgs={ORGANIZATIONS} />
            </Tab>
          </Tabs>
        </div>
      </PageLayout>

      <NewOrgModal isOpen={createOpen} onClose={() => setCreateOpen(false)} />
    </PageSection>
  )
}
