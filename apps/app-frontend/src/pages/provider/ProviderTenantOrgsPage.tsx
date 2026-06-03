/**
 * flow: provider-administration
 * step: pad_tenant_organizations
 * route: /provider/organizations
 */
import { Button, Label, PageSection, Tooltip } from '@patternfly/react-core'
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  MinusCircleIcon,
} from '@patternfly/react-icons'
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import { useNavigate } from 'react-router-dom'
import type { IdpStatus } from '@osac/api-contracts'
import { DEMO_ORGANIZATIONS } from '@osac/api-contracts'
import { PageHeader } from '../../components/layout'

const IDP_STATUS_CONFIG: Record<
  IdpStatus,
  { color: 'green' | 'orange' | 'red' | 'grey'; label: string; icon: React.ReactNode }
> = {
  CONNECTED:    { color: 'green',  label: 'Connected',      icon: <CheckCircleIcon aria-hidden /> },
  DEGRADED:     { color: 'orange', label: 'Degraded',       icon: <ExclamationTriangleIcon aria-hidden /> },
  DISCONNECTED: { color: 'red',    label: 'Disconnected',   icon: <ExclamationCircleIcon aria-hidden /> },
  UNCONFIGURED: { color: 'grey',   label: 'Not configured', icon: <MinusCircleIcon aria-hidden /> },
}

export function ProviderTenantOrgsPage() {
  const navigate = useNavigate()

  return (
    <PageSection>
      <PageHeader
        title="Tenant organizations"
        description="All tenant organizations registered on this platform."
        actions={
          <Tooltip content="Organization creation is not yet implemented.">
            <Button variant="primary" isAriaDisabled>
              Create organization
            </Button>
          </Tooltip>
        }
      />

      <Table aria-label="Tenant organizations" variant="compact">
        <Thead>
          <Tr>
            <Th>Organization</Th>
            <Th>Realm</Th>
            <Th>Identity provider</Th>
            <Th>Tenant admins</Th>
            <Th>Projects</Th>
            <Th>Clusters</Th>
            <Th>VMs</Th>
            <Th>Status</Th>
            <Th aria-label="Actions" />
          </Tr>
        </Thead>
        <Tbody>
          {DEMO_ORGANIZATIONS.map((org) => {
            const idpCfg = org.idp
              ? IDP_STATUS_CONFIG[org.idp.status]
              : IDP_STATUS_CONFIG.UNCONFIGURED

            return (
              <Tr
                key={org.id}
                isClickable
                onRowClick={() => navigate(`/provider/organizations/${org.id}`)}
              >
                <Td dataLabel="Organization">
                  <span style={{ fontWeight: 600 }}>{org.displayName}</span>
                  <br />
                  <span style={{ fontSize: '0.8rem', color: 'var(--pf-t--global--text--color--subtle)' }}>
                    {org.metadata.name}
                  </span>
                </Td>
                <Td dataLabel="Realm">
                  {org.realm
                    ? <code style={{ fontSize: '0.8rem' }}>{org.realm}</code>
                    : <span style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>—</span>}
                </Td>
                <Td dataLabel="Identity provider">
                  {org.idp ? (
                    <Label color={idpCfg.color} icon={idpCfg.icon} isCompact>
                      {org.idp.type} · {idpCfg.label}
                    </Label>
                  ) : (
                    <Label color="grey" isCompact>{idpCfg.label}</Label>
                  )}
                </Td>
                <Td dataLabel="Tenant admins">
                  {org.tenantAdmins?.length ?? '—'}
                </Td>
                <Td dataLabel="Projects">
                  {org.projects?.length ?? '—'}
                </Td>
                <Td dataLabel="Clusters">
                  {org.clusterCount ?? '—'}
                </Td>
                <Td dataLabel="VMs">{org.vmCount ?? '—'}</Td>
                <Td dataLabel="Status">
                  <Label color={org.status === 'active' ? 'green' : 'grey'} isCompact>
                    {org.status ?? 'unknown'}
                  </Label>
                </Td>
                <Td dataLabel="Actions" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="link"
                    isInline
                    onClick={() => navigate(`/provider/organizations/${org.id}`)}
                  >
                    View details
                  </Button>
                </Td>
              </Tr>
            )
          })}
        </Tbody>
      </Table>
    </PageSection>
  )
}
