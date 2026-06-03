/**
 * route: /provider/organizations/:id
 */
import {
  Alert,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Card,
  CardBody,
  CardTitle,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  Label,
  PageBreadcrumb,
  PageSection,
  ProgressStep,
  ProgressStepper,
  Tab,
  TabContent,
  TabTitleText,
  Tabs,
  Title,
  Tooltip,
} from '@patternfly/react-core'
import { KeyIcon, UserIcon } from '@patternfly/react-icons'
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { IdpStatus, Organization } from '@osac/api-contracts'
import { DEMO_ORGANIZATIONS } from '@osac/api-contracts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const IDP_STEP_INFO: Record<IdpStatus, { configuredVariant: 'success' | 'warning' | 'danger' | 'default'; healthVariant: 'success' | 'warning' | 'danger' | 'default'; loginVariant: 'success' | 'warning' | 'danger' | 'default'; description: string }> = {
  CONNECTED:    { configuredVariant: 'success', healthVariant: 'success', loginVariant: 'success', description: 'IdP is reachable and users can authenticate.' },
  DEGRADED:     { configuredVariant: 'success', healthVariant: 'warning', loginVariant: 'warning', description: 'IdP is configured but health checks are failing. Break-glass accounts still work.' },
  DISCONNECTED: { configuredVariant: 'success', healthVariant: 'danger',  loginVariant: 'danger',  description: 'IdP is unreachable. Only break-glass accounts can log in.' },
  UNCONFIGURED: { configuredVariant: 'default', healthVariant: 'default', loginVariant: 'default', description: 'No external IdP configured. Only break-glass accounts exist.' },
}

function isStaleCheck(lastHealthCheck?: string): boolean {
  if (!lastHealthCheck) return false
  return Date.now() - new Date(lastHealthCheck).getTime() > 60 * 60 * 1000
}

function formatTs(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
}

// ---------------------------------------------------------------------------
// Sub-tabs
// ---------------------------------------------------------------------------

function OverviewTab({ org }: { org: Organization }) {
  const statsItems = [
    { label: 'Tenant admins', value: org.tenantAdmins?.length ?? 0, icon: <UserIcon /> },
    { label: 'Projects', value: org.projects?.length ?? 0, icon: <KeyIcon /> },
    { label: 'Clusters', value: org.clusterCount ?? 0 },
    { label: 'VMs', value: org.vmCount ?? 0 },
  ]

  return (
    <Grid hasGutter>
      <GridItem md={6}>
        <Card>
          <CardTitle>Identity</CardTitle>
          <CardBody>
            <DescriptionList>
              <DescriptionListGroup>
                <DescriptionListTerm>Display name</DescriptionListTerm>
                <DescriptionListDescription>{org.displayName}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Realm</DescriptionListTerm>
                <DescriptionListDescription>
                  {org.realm ? <code>{org.realm}</code> : '—'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Status</DescriptionListTerm>
                <DescriptionListDescription>
                  <Label color={org.status === 'active' ? 'green' : 'grey'} isCompact>
                    {org.status ?? 'unknown'}
                  </Label>
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Created</DescriptionListTerm>
                <DescriptionListDescription>{formatTs(org.metadata.createdAt)}</DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </CardBody>
        </Card>
      </GridItem>

      <GridItem md={6}>
        <Card>
          <CardTitle>Resource summary</CardTitle>
          <CardBody>
            <Flex>
              {statsItems.map((s) => (
                <FlexItem key={s.label} style={{ textAlign: 'center', minWidth: '80px' }}>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.1 }}>{s.value}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--pf-t--global--text--color--subtle)', marginTop: '4px' }}>{s.label}</div>
                </FlexItem>
              ))}
            </Flex>
          </CardBody>
        </Card>
      </GridItem>

      {org.description && (
        <GridItem>
          <Card>
            <CardTitle>Description</CardTitle>
            <CardBody>{org.description}</CardBody>
          </Card>
        </GridItem>
      )}
    </Grid>
  )
}

function IdentityProviderTab({ org }: { org: Organization }) {
  const idp = org.idp
  const status = idp?.status ?? 'UNCONFIGURED'
  const info = IDP_STEP_INFO[status]
  const stale = isStaleCheck(idp?.lastHealthCheck)

  return (
    <Grid hasGutter>
      <GridItem>
        <Card>
          <CardTitle>IdP lifecycle</CardTitle>
          <CardBody>
            <ProgressStepper aria-label="IdP lifecycle">
              <ProgressStep
                variant={idp ? 'success' : 'default'}
                id="step-configured"
                titleId="step-configured-title"
                aria-label="Configured"
              >
                Configured
                <div style={{ fontSize: '0.8rem', color: 'var(--pf-t--global--text--color--subtle)', marginTop: '4px' }}>
                  {idp ? `${idp.type} — ${idp.issuerUrl ?? 'endpoint not set'}` : 'No external IdP configured. Add one to enable org user logins.'}
                </div>
              </ProgressStep>
              <ProgressStep
                variant={idp ? info.healthVariant : 'default'}
                id="step-health"
                titleId="step-health-title"
                aria-label="Health check passed"
              >
                Health check passed
                <div style={{ fontSize: '0.8rem', color: 'var(--pf-t--global--text--color--subtle)', marginTop: '4px' }}>
                  {idp
                    ? `Last checked: ${formatTs(idp.lastHealthCheck)}${stale ? ' (stale)' : ''}`
                    : 'Configure an IdP to enable health monitoring.'}
                </div>
              </ProgressStep>
              <ProgressStep
                variant={idp ? info.loginVariant : 'default'}
                id="step-login"
                titleId="step-login-title"
                aria-label="Tenant users can log in"
              >
                Tenant users can log in
                <div style={{ fontSize: '0.8rem', color: 'var(--pf-t--global--text--color--subtle)', marginTop: '4px' }}>
                  {info.description}
                </div>
              </ProgressStep>
            </ProgressStepper>
          </CardBody>
        </Card>
      </GridItem>

      {idp && (
        <GridItem md={6}>
          <Card>
            <CardTitle>IdP configuration</CardTitle>
            <CardBody>
              <DescriptionList>
                <DescriptionListGroup>
                  <DescriptionListTerm>Type</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Label color="blue" isCompact>{idp.type}</Label>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Issuer / endpoint URL</DescriptionListTerm>
                  <DescriptionListDescription>
                    <code style={{ fontSize: '0.8rem' }}>{idp.issuerUrl ?? '—'}</code>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                {idp.clientId && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>Client ID</DescriptionListTerm>
                    <DescriptionListDescription>
                      <code style={{ fontSize: '0.8rem' }}>{idp.clientId}</code>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                )}
                <DescriptionListGroup>
                  <DescriptionListTerm>Last health check</DescriptionListTerm>
                  <DescriptionListDescription>
                    {formatTs(idp.lastHealthCheck)}
                    {stale && (
                      <Label color="orange" isCompact style={{ marginLeft: '8px' }}>Stale</Label>
                    )}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
              <div style={{ marginTop: '16px' }}>
                <Tooltip content="IdP connection testing is not yet implemented.">
                  <Button variant="secondary" isAriaDisabled>Test connection</Button>
                </Tooltip>
              </div>
            </CardBody>
          </Card>
        </GridItem>
      )}

      {!idp && (
        <GridItem>
          <Alert
            variant="info"
            isInline
            title="No external IdP configured"
          >
            Only break-glass accounts (stored in Keycloak directly) can log in to this organization.
            Configure an IdP to allow users to authenticate via your corporate directory.
          </Alert>
        </GridItem>
      )}
    </Grid>
  )
}

function TenantAdminsTab({ org }: { org: Organization }) {
  const admins = org.tenantAdmins ?? []

  return (
    <Grid hasGutter>
      <GridItem>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <Title headingLevel="h3" size="md">
              Tenant admins ({admins.length})
            </Title>
          </FlexItem>
          <FlexItem>
            <Tooltip content="Adding tenant admins is not yet implemented.">
              <Button variant="primary" isAriaDisabled>Add tenant admin</Button>
            </Tooltip>
          </FlexItem>
        </Flex>
      </GridItem>
      <GridItem>
        <Card>
          <CardBody style={{ padding: 0 }}>
            <Table aria-label="Tenant admins" variant="compact">
              <Thead>
                <Tr>
                  <Th>Email</Th>
                  <Th>Type</Th>
                  <Th>Created</Th>
                  <Th aria-label="Actions" />
                </Tr>
              </Thead>
              <Tbody>
                {admins.length === 0 && (
                  <Tr>
                    <Td colSpan={4} style={{ textAlign: 'center', color: 'var(--pf-t--global--text--color--subtle)' }}>
                      No tenant admins.
                    </Td>
                  </Tr>
                )}
                {admins.map((admin) => (
                  <Tr key={admin.id}>
                    <Td dataLabel="Email">{admin.email}</Td>
                    <Td dataLabel="Type">
                      {admin.isBreakGlass ? (
                        <Label color="yellow" isCompact>Break-glass</Label>
                      ) : (
                        <Label color="blue" isCompact>IdP user</Label>
                      )}
                    </Td>
                    <Td dataLabel="Created">{formatTs(admin.createdAt)}</Td>
                    <Td dataLabel="Actions">
                      <Tooltip content="Credential reset is not yet implemented.">
                        <Button variant="link" isInline isAriaDisabled>Reset credentials</Button>
                      </Tooltip>
                      {' · '}
                      <Tooltip content="Admin removal is not yet implemented.">
                        <Button variant="link" isDanger isInline isAriaDisabled>Remove</Button>
                      </Tooltip>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardBody>
        </Card>
      </GridItem>
    </Grid>
  )
}

function ProjectsTab({ org }: { org: Organization }) {
  const projects = org.projects ?? []

  return (
    <Grid hasGutter>
      <GridItem>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <Title headingLevel="h3" size="md">
              Projects ({projects.length})
            </Title>
          </FlexItem>
          <FlexItem>
            <Tooltip content="Project creation is not yet implemented.">
              <Button variant="primary" isAriaDisabled>Create project</Button>
            </Tooltip>
          </FlexItem>
        </Flex>
      </GridItem>
      <GridItem>
        <Card>
          <CardBody style={{ padding: 0 }}>
            <Table aria-label="Projects" variant="compact">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>OpenShift namespace</Th>
                  <Th>Created</Th>
                </Tr>
              </Thead>
              <Tbody>
                {projects.length === 0 && (
                  <Tr>
                    <Td colSpan={3} style={{ textAlign: 'center', color: 'var(--pf-t--global--text--color--subtle)' }}>
                      No projects. Create a project to give tenants a namespace for their workloads.
                    </Td>
                  </Tr>
                )}
                {projects.map((project) => (
                  <Tr key={project.id}>
                    <Td dataLabel="Name" style={{ fontWeight: 500 }}>{project.name}</Td>
                    <Td dataLabel="OpenShift namespace">
                      <code style={{ fontSize: '0.8rem' }}>{project.openshiftNamespace}</code>
                    </Td>
                    <Td dataLabel="Created">{formatTs(project.createdAt)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardBody>
        </Card>
      </GridItem>
    </Grid>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const TABS = ['overview', 'idp', 'admins', 'projects'] as const
type TabKey = (typeof TABS)[number]

const TAB_LABELS: Record<TabKey, string> = {
  overview: 'Overview',
  idp: 'Identity Provider',
  admins: 'Tenant Admins',
  projects: 'Projects',
}

export function ProviderOrgDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabKey>('overview')

  const org = DEMO_ORGANIZATIONS.find((o) => o.id === id)

  if (!org) {
    return (
      <PageSection>
        <Alert variant="danger" title="Organization not found">
          No organization with ID <code>{id}</code> found.
        </Alert>
      </PageSection>
    )
  }

  return (
    <>
      <PageBreadcrumb>
        <Breadcrumb>
          <BreadcrumbItem
            to="#"
            onClick={(e) => { e.preventDefault(); navigate('/provider/organizations') }}
          >
            Organizations
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{org.displayName}</BreadcrumbItem>
        </Breadcrumb>
      </PageBreadcrumb>

      <PageSection>
        <Flex alignItems={{ default: 'alignItemsCenter' }} style={{ marginBottom: '16px' }}>
          <FlexItem>
            <Title headingLevel="h1" size="2xl">{org.displayName}</Title>
            <span style={{ color: 'var(--pf-t--global--text--color--subtle)', fontSize: '0.9rem' }}>
              {org.metadata.name}
              {org.realm && <> · realm: <code style={{ fontSize: '0.85rem' }}>{org.realm}</code></>}
            </span>
          </FlexItem>
          <FlexItem align={{ default: 'alignRight' }}>
            <Label color={org.status === 'active' ? 'green' : 'grey'}>
              {org.status ?? 'unknown'}
            </Label>
          </FlexItem>
        </Flex>

        <Tabs
          activeKey={activeTab}
          onSelect={(_, k) => setActiveTab(k as TabKey)}
          aria-label="Organization detail tabs"
          style={{ marginBottom: '24px' }}
        >
          {TABS.map((key) => (
            <Tab
              key={key}
              eventKey={key}
              title={<TabTitleText>{TAB_LABELS[key]}</TabTitleText>}
              tabContentId={`tab-${key}`}
            />
          ))}
        </Tabs>

        <TabContent id="tab-overview" hidden={activeTab !== 'overview'}>
          <OverviewTab org={org} />
        </TabContent>
        <TabContent id="tab-idp" hidden={activeTab !== 'idp'}>
          <IdentityProviderTab org={org} />
        </TabContent>
        <TabContent id="tab-admins" hidden={activeTab !== 'admins'}>
          <TenantAdminsTab org={org} />
        </TabContent>
        <TabContent id="tab-projects" hidden={activeTab !== 'projects'}>
          <ProjectsTab org={org} />
        </TabContent>
      </PageSection>
    </>
  )
}
