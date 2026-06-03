/**
 * flow: tenant-administration
 * step: tad_users
 */
import { Button, Label, PageSection } from '@patternfly/react-core'
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import { EVERGREEN_USERS, NORTHSTAR_USERS } from '@osac/api-contracts'
import { useSession } from '../../contexts/SessionContext'
import { PageHeader } from '../../components/layout'

export function AdminUsersPage() {
  const { selectedTenant } = useSession()
  const users = selectedTenant === 'northstar' ? NORTHSTAR_USERS : EVERGREEN_USERS

  return (
    <PageSection>
      <PageHeader
        title="Users"
        description="Manage users and access for your organization."
        actions={
          <Button
            variant="primary"
            onClick={() => {
              /* stub */
            }}
          >
            Add user
          </Button>
        }
      />

      <Table aria-label="Tenant users">
        <Thead>
          <Tr>
            <Th>Name</Th>
            <Th>Email</Th>
            <Th>Role</Th>
            <Th>Status</Th>
            <Th>Last login</Th>
          </Tr>
        </Thead>
        <Tbody>
          {users.map((user) => (
            <Tr key={user.id}>
              <Td dataLabel="Name" style={{ fontWeight: 600 }}>
                {user.name}
              </Td>
              <Td dataLabel="Email">{user.email}</Td>
              <Td dataLabel="Role">
                <Label
                  color={user.role === 'tenantAdmin' ? 'purple' : 'blue'}
                  isCompact
                  variant="outline"
                >
                  {user.role === 'tenantAdmin' ? 'Admin' : 'User'}
                </Label>
              </Td>
              <Td dataLabel="Status">
                <Label color={user.status === 'active' ? 'green' : 'grey'} isCompact>
                  {user.status}
                </Label>
              </Td>
              <Td
                dataLabel="Last login"
                style={{
                  color: 'var(--pf-t--global--text--color--subtle)',
                }}
              >
                {user.lastLogin ?? '—'}
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </PageSection>
  )
}
