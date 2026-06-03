/**
 * route: /provider/security
 * Replaces the "Security & Compliance" placeholder.
 * Renamed to "Roles & Identity" in nav.
 */
import {
  Card,
  CardBody,
  CardTitle,
  Content,
  Grid,
  GridItem,
  Label,
  PageSection,
  Title,
} from '@patternfly/react-core'
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import type { OsacSystemRole, RoleAssignment } from '@osac/api-contracts'
import { DEMO_SYSTEM_ROLE_ASSIGNMENTS } from '@osac/api-contracts'
import { PageHeader } from '../../components/layout'

// ---------------------------------------------------------------------------
// Role display helpers
// ---------------------------------------------------------------------------

const SYSTEM_ROLE_CONFIG: Record<OsacSystemRole, { color: 'red' | 'blue' | 'teal'; label: string; description: string; assignableBy: string; scope: string }> = {
  'cloud-provider-admin': {
    color: 'red',
    label: 'Cloud Provider Admin',
    description: 'Full control over all organizations and platform configuration.',
    assignableBy: 'Break-glass only',
    scope: 'System Organization',
  },
  'cloud-provider-reader': {
    color: 'blue',
    label: 'Cloud Provider Reader',
    description: 'Read-only view across all organizations.',
    assignableBy: 'Cloud Provider Admin',
    scope: 'System Organization',
  },
  'catalog-curator': {
    color: 'teal',
    label: 'Catalog Curator',
    description: 'Publish and edit global catalog items.',
    assignableBy: 'Cloud Provider Admin',
    scope: 'System Organization',
  },
}

const ORG_ROLE_INFO = [
  {
    role: 'tenant-admin',
    color: 'purple' as const,
    label: 'Tenant Admin',
    description: 'Full control within their organization.',
    assignableBy: 'Cloud Provider Admin',
    scope: 'Tenant Organization',
  },
  {
    role: 'tenant-reader',
    color: 'blue' as const,
    label: 'Tenant Reader',
    description: 'Read-only view within the organization.',
    assignableBy: 'Tenant Admin',
    scope: 'Tenant Organization',
  },
  {
    role: 'tenant-user',
    color: 'grey' as const,
    label: 'Tenant User',
    description: 'Consume resources, create workloads.',
    assignableBy: 'Tenant Admin',
    scope: 'Tenant Organization',
  },
]

function SystemRoleLabel({ role }: { role: RoleAssignment['role'] }) {
  if (role in SYSTEM_ROLE_CONFIG) {
    const cfg = SYSTEM_ROLE_CONFIG[role as OsacSystemRole]
    return <Label color={cfg.color} isCompact>{cfg.label}</Label>
  }
  const orgRole = ORG_ROLE_INFO.find((r) => r.role === role)
  if (orgRole) {
    return <Label color={orgRole.color} isCompact>{orgRole.label}</Label>
  }
  return <Label isCompact>{role}</Label>
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ProviderRbacPage() {
  return (
    <PageSection>
      <PageHeader
        title="Roles & Identity"
        description="System-level role assignments and the platform role model. System-level roles are scoped to the System Organization only — Tenant Admins cannot be assigned these roles."
      />

      {/* System Organization Role Assignments */}
      <Title headingLevel="h2" size="lg" style={{ margin: '24px 0 12px' }}>
        System Organization — Role assignments
      </Title>

      <Card>
        <CardBody style={{ padding: 0 }}>
          <Table aria-label="System role assignments" variant="compact">
            <Thead>
              <Tr>
                <Th>Subject</Th>
                <Th>Role</Th>
                <Th>Source</Th>
              </Tr>
            </Thead>
            <Tbody>
              {DEMO_SYSTEM_ROLE_ASSIGNMENTS.map((assignment, i) => (
                <Tr key={i}>
                  <Td dataLabel="Subject">
                    <code style={{ fontSize: '0.85rem' }}>{assignment.subject}</code>
                  </Td>
                  <Td dataLabel="Role">
                    <SystemRoleLabel role={assignment.role} />
                  </Td>
                  <Td dataLabel="Source">
                    {assignment.source === 'break-glass' ? (
                      <Label color="yellow" isCompact>Break-glass</Label>
                    ) : (
                      <Label color="grey" isCompact>IdP group</Label>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </CardBody>
      </Card>

      {/* Role Model Reference */}
      <Title headingLevel="h2" size="lg" style={{ margin: '32px 0 12px' }}>
        Role model reference
      </Title>

      <Grid hasGutter>
        <GridItem md={6}>
          <Card>
            <CardTitle>System-level roles</CardTitle>
            <CardBody>
              <Content component="p" style={{ marginBottom: '12px', color: 'var(--pf-t--global--text--color--subtle)', fontSize: '0.85rem' }}>
                Only assignable within the <strong>System Organization</strong>. Cannot be granted to tenant users.
              </Content>
              <Table aria-label="System roles" variant="compact" borders={false}>
                <Thead>
                  <Tr>
                    <Th>Role</Th>
                    <Th>Assignable by</Th>
                    <Th>Description</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {Object.entries(SYSTEM_ROLE_CONFIG).map(([key, cfg]) => (
                    <Tr key={key}>
                      <Td dataLabel="Role">
                        <Label color={cfg.color} isCompact>{cfg.label}</Label>
                      </Td>
                      <Td dataLabel="Assignable by" style={{ fontSize: '0.8rem' }}>{cfg.assignableBy}</Td>
                      <Td dataLabel="Description" style={{ fontSize: '0.8rem' }}>{cfg.description}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem md={6}>
          <Card>
            <CardTitle>Org-level roles</CardTitle>
            <CardBody>
              <Content component="p" style={{ marginBottom: '12px', color: 'var(--pf-t--global--text--color--subtle)', fontSize: '0.85rem' }}>
                Scoped to individual <strong>tenant organizations</strong>. Managed per-org by Tenant Admins and Cloud Provider Admins.
              </Content>
              <Table aria-label="Org roles" variant="compact" borders={false}>
                <Thead>
                  <Tr>
                    <Th>Role</Th>
                    <Th>Assignable by</Th>
                    <Th>Description</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {ORG_ROLE_INFO.map((r) => (
                    <Tr key={r.role}>
                      <Td dataLabel="Role">
                        <Label color={r.color} isCompact>{r.label}</Label>
                      </Td>
                      <Td dataLabel="Assignable by" style={{ fontSize: '0.8rem' }}>{r.assignableBy}</Td>
                      <Td dataLabel="Description" style={{ fontSize: '0.8rem' }}>{r.description}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem>
          <Card>
            <CardTitle>Security constraints</CardTitle>
            <CardBody>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.9rem', lineHeight: 1.7 }}>
                <li>System-level roles can only be assigned in the <strong>System Organization</strong> — they are not visible in tenant org management.</li>
                <li>Tenant Admins <strong>cannot assign or escalate</strong> to system-level roles.</li>
                <li><strong>Break-glass accounts</strong> are stored directly in Keycloak — they authenticate without routing through the org IdP, making them available even when the IdP is unreachable.</li>
                <li>Role-to-group mappings from the org IdP are enforced by <strong>Authorino</strong> at the API gateway layer.</li>
              </ul>
            </CardBody>
          </Card>
        </GridItem>
      </Grid>
    </PageSection>
  )
}
