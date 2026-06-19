/**
 * flow: manage-rbac
 * step: rbac_roles / group_mappings / enforcement
 * route: /provider/rbac (providerAdmin)
 */
import { useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  ExpandableSection,
  Label,
  MenuToggle,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  SearchInput,
  Select,
  SelectList,
  SelectOption,
  Tab,
  TabTitleText,
  Tabs,
  Title,
} from '@patternfly/react-core'
import { ActionsColumn } from '@patternfly/react-table'
import { LockIcon } from '@patternfly/react-icons/dist/esm/icons/lock-icon'
import { ObjectsTable, PageLayout } from '@osac/ui-components'
import type { ObjectsTableColumn } from '@osac/ui-components'
import {
  ALL_ROLES,
  GROUP_MAPPINGS,
  type GroupMapping,
  ORG_ROLES,
  PERMISSION_CATEGORIES,
  ROLE_PERMISSIONS,
  type RbacMember,
  type RbacRole,
  type RbacScopeId,
  SYSTEM_ROLES,
  memberCountForRole,
  membersForGroup,
  membersForRole,
  roleLabel,
} from '../../mocks/rbac-store'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ScopeBadge({ scope }: { scope: 'system' | 'org' }) {
  return (
    <Label isCompact color={scope === 'system' ? 'purple' : 'blue'}>
      {scope}
    </Label>
  )
}

// ---------------------------------------------------------------------------
// Members modal
// ---------------------------------------------------------------------------

interface MembersModalProps {
  role: RbacRole | null
  onClose: () => void
}

function MembersModal({ role, onClose }: MembersModalProps) {
  const [search, setSearch] = useState('')

  if (!role) return null

  const allMembers = membersForRole(role.id)
  const filtered = allMembers.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()),
  )

  const columns: ObjectsTableColumn<RbacMember>[] = [
    { label: 'Name', dataLabel: 'Name', render: (m) => m.name },
    {
      label: 'Email',
      dataLabel: 'Email',
      render: (m) => <code style={{ fontSize: '0.85em' }}>{m.email}</code>,
    },
    {
      label: 'Keycloak group',
      dataLabel: 'Keycloak group',
      render: (m) => <code style={{ fontSize: '0.8em' }}>{m.group}</code>,
    },
    {
      label: 'Realm',
      dataLabel: 'Realm',
      render: (m) => <code style={{ fontSize: '0.8em' }}>{m.realm}</code>,
    },
  ]

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen
      onClose={onClose}
      aria-label={`Members of ${role.label}`}
    >
      <ModalHeader
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Members: {role.label}
            <Badge isRead>{filtered.length}</Badge>
          </span>
        }
        description="Users bound to this role via Keycloak group membership."
      />
      <ModalBody>
        <SearchInput
          placeholder="Filter by name or email…"
          value={search}
          onChange={(_, v) => setSearch(v)}
          onClear={() => setSearch('')}
          style={{ marginBottom: 12 }}
        />
        {allMembers.length === 0 ? (
          <div
            style={{
              padding: 24,
              textAlign: 'center',
              color: 'var(--pf-t--global--text--color--subtle)',
            }}
          >
            No users are currently bound to this role.
          </div>
        ) : (
          <ObjectsTable
            ariaLabel={`${role.label} members`}
            columns={columns}
            rows={filtered}
            getRowKey={(m) => m.email}
            variant="compact"
          />
        )}
        <Alert
          variant="info"
          isInline
          isPlain
          title="Membership is managed by the external IdP — changes take effect after the next Keycloak sync."
          style={{ marginTop: 12 }}
        />
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Permissions modal
// ---------------------------------------------------------------------------

interface PermissionsModalProps {
  role: RbacRole | null
  onClose: () => void
}

function PermissionsModal({ role, onClose }: PermissionsModalProps) {
  const [search, setSearch] = useState('')
  const [granted, setGranted] = useState<Set<string>>(() =>
    role ? new Set(ROLE_PERMISSIONS[role.id]) : new Set(),
  )
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(PERMISSION_CATEGORIES.map((c) => c.label)),
  )
  const [publishing, setPublishing] = useState(false)

  if (!role) return null

  const original = ROLE_PERMISSIONS[role.id]
  const pendingChanges =
    [...granted].filter((p) => !original.has(p)).length +
    [...original].filter((p) => !granted.has(p)).length

  function toggle(perm: string) {
    setGranted((prev) => {
      const next = new Set(prev)
      if (next.has(perm)) next.delete(perm)
      else next.add(perm)
      return next
    })
  }

  function handlePublish() {
    setPublishing(true)
    setTimeout(() => {
      setPublishing(false)
      onClose()
    }, 900)
  }

  return (
    <Modal
      variant={ModalVariant.large}
      isOpen
      onClose={onClose}
      aria-label={`Edit permissions for ${role.label}`}
    >
      <ModalHeader
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Edit permissions: {role.label}
            <Badge isRead>{granted.size} granted</Badge>
            {pendingChanges > 0 && (
              <Badge>
                {pendingChanges} pending change{pendingChanges > 1 ? 's' : ''}
              </Badge>
            )}
          </span>
        }
      />
      <ModalBody>
        <SearchInput
          placeholder="Filter permissions…"
          value={search}
          onChange={(_, v) => setSearch(v)}
          onClear={() => setSearch('')}
          style={{ marginBottom: 16 }}
        />
        <div style={{ display: 'grid', gap: 8 }}>
          {PERMISSION_CATEGORIES.map((cat) => {
            const visible = cat.permissions.filter((p) =>
              p.toLowerCase().includes(search.toLowerCase()),
            )
            if (visible.length === 0) return null
            return (
              <ExpandableSection
                key={cat.label}
                toggleText={`${cat.label} (${visible.filter((p) => granted.has(p)).length} / ${visible.length})`}
                isExpanded={expanded.has(cat.label)}
                onToggle={() =>
                  setExpanded((prev) => {
                    const next = new Set(prev)
                    if (next.has(cat.label)) next.delete(cat.label)
                    else next.add(cat.label)
                    return next
                  })
                }
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '4px 16px',
                    paddingLeft: 16,
                    paddingBottom: 8,
                  }}
                >
                  {visible.map((perm) => (
                    <Checkbox
                      key={perm}
                      id={`perm-${perm}`}
                      label={<code style={{ fontSize: 12 }}>{perm}</code>}
                      isChecked={granted.has(perm)}
                      onChange={() => toggle(perm)}
                      isDisabled={role.readOnly}
                    />
                  ))}
                </div>
              </ExpandableSection>
            )
          })}
        </div>
        <Alert
          variant="warning"
          isInline
          isPlain
          title="Publishing will re-generate Authorino AuthPolicies for this role across all Kuadrant gateways."
          style={{ marginTop: 16 }}
        />
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={handlePublish}
          isDisabled={pendingChanges === 0 || role.readOnly}
          isLoading={publishing}
        >
          {publishing ? 'Publishing…' : 'Publish'}
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Edit mapping modal
// ---------------------------------------------------------------------------

interface EditMappingModalProps {
  mapping: GroupMapping | null
  onClose: () => void
  onSave: (id: string, newRole: RbacScopeId) => void
}

function EditMappingModal({ mapping, onClose, onSave }: EditMappingModalProps) {
  const [roleOpen, setRoleOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<RbacScopeId>(
    mapping?.mappedRole ?? 'tenant-user',
  )

  if (!mapping) return null

  const isUnchanged = selectedRole === mapping.mappedRole

  return (
    <Modal variant={ModalVariant.small} isOpen onClose={onClose} aria-label="Edit group mapping">
      <ModalHeader
        title="Edit mapping"
        description={`Change the OSAC role that Keycloak group "${mapping.kcGroup}" maps to.`}
      />
      <ModalBody>
        <DescriptionList isHorizontal style={{ marginBottom: 16 }}>
          <DescriptionListGroup>
            <DescriptionListTerm>Keycloak group</DescriptionListTerm>
            <DescriptionListDescription>
              <code style={{ fontSize: 12 }}>{mapping.kcGroup}</code>
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Realm</DescriptionListTerm>
            <DescriptionListDescription>
              <code style={{ fontSize: 12 }}>{mapping.realm}</code>
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Current role</DescriptionListTerm>
            <DescriptionListDescription>
              <Label
                isCompact
                color={
                  ALL_ROLES.find((r) => r.id === mapping.mappedRole)?.scope === 'system'
                    ? 'purple'
                    : 'blue'
                }
              >
                {roleLabel(mapping.mappedRole)}
              </Label>
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>

        <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 14 }}>New role</div>
        <Select
          isOpen={roleOpen}
          onOpenChange={setRoleOpen}
          toggle={(ref) => (
            <MenuToggle
              ref={ref}
              onClick={() => setRoleOpen((v) => !v)}
              isExpanded={roleOpen}
              style={{ width: '100%' }}
            >
              <Label
                isCompact
                color={
                  ALL_ROLES.find((r) => r.id === selectedRole)?.scope === 'system'
                    ? 'purple'
                    : 'blue'
                }
              >
                {roleLabel(selectedRole)}
              </Label>
            </MenuToggle>
          )}
          selected={selectedRole}
          onSelect={(_, v) => {
            setSelectedRole(v as RbacScopeId)
            setRoleOpen(false)
          }}
        >
          <SelectList>
            {ALL_ROLES.map((r) => (
              <SelectOption key={r.id} value={r.id}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Label isCompact color={r.scope === 'system' ? 'purple' : 'blue'}>
                    {r.label}
                  </Label>
                  <span style={{ fontSize: 12, color: 'var(--pf-t--global--text--color--subtle)' }}>
                    {r.description.split(' — ')[0]}
                  </span>
                </span>
              </SelectOption>
            ))}
          </SelectList>
        </Select>

        <Alert
          variant="info"
          isInline
          isPlain
          title={`Affects all ${mapping.kcGroup} members at next Keycloak sync.`}
          style={{ marginTop: 12 }}
        />
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          isDisabled={isUnchanged}
          onClick={() => {
            onSave(mapping.id, selectedRole)
            onClose()
          }}
        >
          Save mapping
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Roles tab — scoped section
// ---------------------------------------------------------------------------

interface ScopedRoleTableProps {
  title: string
  roles: RbacRole[]
  onViewMembers: (role: RbacRole) => void
  onEditPermissions: (role: RbacRole) => void
}

function ScopedRoleTable({ title, roles, onViewMembers, onEditPermissions }: ScopedRoleTableProps) {
  const columns: ObjectsTableColumn<RbacRole>[] = [
    {
      label: 'Role',
      dataLabel: 'Role',
      render: (r) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ScopeBadge scope={r.scope} />
          <strong>{r.label}</strong>
          {r.readOnly && (
            <Label isCompact color="grey">
              read-only
            </Label>
          )}
        </span>
      ),
    },
    {
      label: 'ID',
      dataLabel: 'ID',
      render: (r) => <code style={{ fontSize: '0.8em' }}>{r.id}</code>,
    },
    {
      label: 'Description',
      dataLabel: 'Description',
      render: (r) => <span style={{ fontSize: '0.9em' }}>{r.description}</span>,
    },
    {
      label: 'Members',
      dataLabel: 'Members',
      render: (r) => memberCountForRole(r.id),
    },
    {
      isActionCell: true,
      screenReaderText: 'Actions',
      render: (r) => (
        <ActionsColumn
          items={[
            {
              title: 'View members',
              onClick: () => onViewMembers(r),
            },
            {
              title: 'Edit permissions',
              onClick: () => onEditPermissions(r),
              isDisabled: r.readOnly,
              description: r.readOnly ? 'Read-only role' : undefined,
            },
          ]}
        />
      ),
    },
  ]

  return (
    <div style={{ marginBottom: 24 }}>
      <Title headingLevel="h3" size="md" style={{ marginBottom: 8 }}>
        {title}
      </Title>
      <ObjectsTable
        ariaLabel={`${title} roles`}
        columns={columns}
        rows={roles}
        getRowKey={(r) => r.id}
        variant="compact"
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Group → Role mappings tab
// ---------------------------------------------------------------------------

interface GroupMappingsTabProps {
  mappings: GroupMapping[]
  onEdit: (mapping: GroupMapping) => void
  onRemove: (id: string) => void
}

function GroupMappingsTab({ mappings, onEdit, onRemove }: GroupMappingsTabProps) {
  const columns: ObjectsTableColumn<GroupMapping>[] = [
    {
      label: 'Keycloak group',
      dataLabel: 'Keycloak group',
      render: (m) => <code style={{ fontSize: '0.8em' }}>{m.kcGroup}</code>,
    },
    {
      label: 'Realm',
      dataLabel: 'Realm',
      render: (m) => <code style={{ fontSize: '0.8em' }}>{m.realm}</code>,
    },
    {
      label: 'Mapped role',
      dataLabel: 'Mapped role',
      render: (m) => {
        const r = ALL_ROLES.find((x) => x.id === m.mappedRole)
        return (
          <Label isCompact color={r?.scope === 'system' ? 'purple' : 'blue'}>
            {roleLabel(m.mappedRole)}
          </Label>
        )
      },
    },
    {
      label: 'Members',
      dataLabel: 'Members',
      render: (m) => membersForGroup(m.kcGroup).length,
    },
    {
      isActionCell: true,
      screenReaderText: 'Actions',
      render: (m) => (
        <ActionsColumn
          items={[
            { title: 'Edit mapping', onClick: () => onEdit(m) },
            { isSeparator: true },
            {
              title: 'Remove',
              onClick: () => onRemove(m.id),
              isDanger: true,
            },
          ]}
        />
      ),
    },
  ]

  return (
    <div style={{ marginTop: 16 }}>
      <ObjectsTable
        ariaLabel="Group to role mappings"
        columns={columns}
        rows={mappings}
        getRowKey={(m) => m.id}
        defaultPageSize={10}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Enforcement tab
// ---------------------------------------------------------------------------

const SAMPLE_AUTH_POLICY = `apiVersion: kuadrant.io/v1beta2
kind: AuthPolicy
metadata:
  name: osac-tenant-admin-policy
  namespace: osac-gateway
spec:
  targetRef:
    group: gateway.networking.k8s.io
    kind: HTTPRoute
    name: fulfillment-tenant-admin-route
  rules:
    authentication:
      jwt-bearer:
        jwt:
          issuerUrl: https://auth.osac.internal/realms/northstar.osac
    authorization:
      roles-check:
        opa:
          inlineRego: |
            allow {
              claims := input.auth.identity.claims
              "tenant-admin" in claims.groups
            }
    response:
      success:
        headers:
          x-osac-role:
            plain:
              value: "tenant-admin"`.trim()

function EnforcementTab() {
  return (
    <div style={{ marginTop: 16, display: 'grid', gap: 16 }}>
      <Alert
        variant="info"
        isInline
        title="Deny-by-default: Authorino rejects all requests not matching an AuthPolicy"
      >
        Every API endpoint in the OSAC fulfillment service is protected by an Authorino{' '}
        <code>AuthPolicy</code> attached to a Kuadrant <code>HTTPRoute</code>. Requests without a
        valid Keycloak JWT whose groups claim includes the required role are rejected with{' '}
        <code>401 Unauthorized</code> before reaching the backend.
      </Alert>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
          Sample AuthPolicy — tenant-admin scope
        </div>
        <pre
          style={{
            background: 'var(--pf-t--global--background--color--secondary--default)',
            border: '1px solid var(--pf-t--global--border--color--default)',
            borderRadius: 8,
            padding: 16,
            fontSize: 12,
            overflow: 'auto',
            lineHeight: 1.6,
          }}
        >
          {SAMPLE_AUTH_POLICY}
        </pre>
      </div>
      <div>
        <Button variant="secondary">View all AuthPolicies</Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function RbacManagementPage() {
  const [activeTab, setActiveTab] = useState<string | number>('roles')

  // Roles tab modals
  const [membersRole, setMembersRole] = useState<RbacRole | null>(null)
  const [permissionsRole, setPermissionsRole] = useState<RbacRole | null>(null)

  // Group mappings tab
  const [mappings, setMappings] = useState<GroupMapping[]>(GROUP_MAPPINGS)
  const [editMapping, setEditMapping] = useState<GroupMapping | null>(null)

  function handleSaveMapping(id: string, newRole: RbacScopeId) {
    setMappings((prev) => prev.map((m) => (m.id === id ? { ...m, mappedRole: newRole } : m)))
  }

  function handleRemoveMapping(id: string) {
    setMappings((prev) => prev.filter((m) => m.id !== id))
  }

  const systemRoleCount = SYSTEM_ROLES.length
  const orgRoleCount = ORG_ROLES.length
  const mappingCount = mappings.length

  return (
    <>
      <PageLayout
        title="RBAC Management"
        description="Role definitions, Keycloak group bindings, and Authorino enforcement policies."
        actions={
          <Button variant="secondary" icon={<LockIcon />}>
            Sync from Authorino
          </Button>
        }
      >
        {/* Summary strip */}
        <div
          style={{
            display: 'flex',
            gap: 24,
            padding: '10px 0 20px',
            fontSize: 13,
            color: 'var(--pf-t--global--text--color--subtle)',
          }}
        >
          <span>
            <strong style={{ color: 'var(--pf-t--global--text--color--default)' }}>
              {systemRoleCount}
            </strong>{' '}
            system roles
          </span>
          <span>
            <strong style={{ color: 'var(--pf-t--global--text--color--default)' }}>
              {orgRoleCount}
            </strong>{' '}
            org roles
          </span>
          <span>
            <strong style={{ color: 'var(--pf-t--global--text--color--default)' }}>
              {mappingCount}
            </strong>{' '}
            group mappings
          </span>
          <Label isCompact color="green">
            Enforced by Authorino
          </Label>
        </div>

        <Tabs
          activeKey={activeTab}
          onSelect={(_e, k) => setActiveTab(k)}
          aria-label="RBAC management tabs"
        >
          {/* ── Roles ── */}
          <Tab eventKey="roles" title={<TabTitleText>Roles</TabTitleText>}>
            <div style={{ paddingTop: 16 }}>
              <ScopedRoleTable
                title="System scope"
                roles={SYSTEM_ROLES}
                onViewMembers={setMembersRole}
                onEditPermissions={setPermissionsRole}
              />
              <ScopedRoleTable
                title="Organization scope"
                roles={ORG_ROLES}
                onViewMembers={setMembersRole}
                onEditPermissions={setPermissionsRole}
              />
            </div>
          </Tab>

          {/* ── Group → Role mappings ── */}
          <Tab
            eventKey="mappings"
            title={<TabTitleText>Group → Role mappings ({mappings.length})</TabTitleText>}
          >
            <GroupMappingsTab
              mappings={mappings}
              onEdit={setEditMapping}
              onRemove={handleRemoveMapping}
            />
          </Tab>

          {/* ── Enforcement ── */}
          <Tab eventKey="enforcement" title={<TabTitleText>Enforcement</TabTitleText>}>
            <EnforcementTab />
          </Tab>
        </Tabs>
      </PageLayout>

      {/* Modals */}
      {membersRole && <MembersModal role={membersRole} onClose={() => setMembersRole(null)} />}
      {permissionsRole && (
        <PermissionsModal role={permissionsRole} onClose={() => setPermissionsRole(null)} />
      )}
      {editMapping && (
        <EditMappingModal
          mapping={editMapping}
          onClose={() => setEditMapping(null)}
          onSave={handleSaveMapping}
        />
      )}
    </>
  )
}
