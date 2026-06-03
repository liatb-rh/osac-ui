/**
 * flow: tenant-administration | provider-administration
 * step: tad_cluster_offerings | pad_cluster_offerings
 * route: /admin/cluster-offerings  (tenantAdmin)
 *        /provider/cluster-offerings (providerAdmin)
 *
 * Shared page — role controls which actions and labels are shown:
 *   tenantAdmin   → enable/disable offerings per org, set org-level defaults
 *   providerAdmin → publish/unpublish offerings platform-wide, create/edit offerings
 */
import { useState } from 'react'
import {
  Alert,
  Bullseye,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Divider,
  EmptyState,
  EmptyStateBody,
  Form,
  FormGroup,
  Gallery,
  GalleryItem,
  Label,
  LabelGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  NumberInput,
  PageSection,
  Spinner,
  Switch,
  TextArea,
  TextInput,
} from '@patternfly/react-core'
import { CubesIcon } from '@patternfly/react-icons/dist/esm/icons/cubes-icon'
import type { ClusterCatalogItem } from '@osac/api-contracts'
import { useClusterCatalogItems } from '../../api/useClusterCatalogItems'
import { PageHeader } from '../../components/layout'

interface OrgDefaults {
  workerCount: number
  sshPublicKey: string
}

export interface ClusterOfferingsPageProps {
  /** Determines which actions and labels are rendered. Defaults to 'tenantAdmin'. */
  role?: 'tenantAdmin' | 'providerAdmin'
}

export function AdminClusterOfferingsPage({ role = 'tenantAdmin' }: ClusterOfferingsPageProps) {
  const isProvider = role === 'providerAdmin'

  // Provider sees all items; tenant admin sees only published ones.
  const { data: items, isLoading, error, refetch } = useClusterCatalogItems({
    includeUnpublished: isProvider,
  })

  // tenantAdmin local state: per-org enable/disable + defaults
  const [enabledItems, setEnabledItems] = useState<Record<string, boolean>>({})
  const [orgDefaults, setOrgDefaults] = useState<Record<string, OrgDefaults>>({})
  const [editingItem, setEditingItem] = useState<ClusterCatalogItem | null>(null)
  const [editDefaults, setEditDefaults] = useState<OrgDefaults>({ workerCount: 3, sshPublicKey: '' })

  // providerAdmin local state: published toggle + create modal
  const [publishedOverrides, setPublishedOverrides] = useState<Record<string, boolean>>({})
  const [showCreateModal, setShowCreateModal] = useState(false)

  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)

  // ── Helpers ───────────────────────────────────────────────────────────────

  function isEnabled(item: ClusterCatalogItem): boolean {
    return enabledItems[item.id] !== false
  }

  function isPublished(item: ClusterCatalogItem): boolean {
    return publishedOverrides[item.id] !== undefined
      ? publishedOverrides[item.id]
      : (item.published ?? false)
  }

  function flash(msg: string) {
    setSaveSuccess(msg)
    setTimeout(() => setSaveSuccess(null), 4000)
  }

  function handleToggle(item: ClusterCatalogItem, checked: boolean) {
    if (isProvider) {
      setPublishedOverrides((p) => ({ ...p, [item.id]: checked }))
      flash(`"${item.title}" ${checked ? 'published' : 'unpublished'} platform-wide.`)
    } else {
      setEnabledItems((p) => ({ ...p, [item.id]: checked }))
      flash(`"${item.title}" ${checked ? 'enabled' : 'disabled'} for your organization.`)
    }
  }

  function handleEditDefaults(item: ClusterCatalogItem) {
    setEditingItem(item)
    setEditDefaults(orgDefaults[item.id] ?? { workerCount: 3, sshPublicKey: '' })
  }

  function handleSaveDefaults() {
    if (!editingItem) return
    setOrgDefaults((p) => ({ ...p, [editingItem.id]: editDefaults }))
    flash(`Org defaults for "${editingItem.title}" saved.`)
    setEditingItem(null)
  }

  // ── Derived UI values ─────────────────────────────────────────────────────

  const pageSubtitle = isProvider
    ? 'Define and publish the OpenShift cluster types available for tenant provisioning.'
    : 'Control which cluster types your organization can provision and set org-level defaults.'

  const toggleLabel = (item: ClusterCatalogItem, active: boolean) =>
    isProvider
      ? `${active ? 'Unpublish' : 'Publish'} ${item.title}`
      : `${active ? 'Disable' : 'Enable'} ${item.title} for your organization`

  const activeToggle = (item: ClusterCatalogItem) =>
    isProvider ? isPublished(item) : isEnabled(item)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <PageSection isFilled>
      <PageHeader
        title="Cluster Offerings"
        subtitle={pageSubtitle}
        actions={
          isProvider ? (
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              Create offering
            </Button>
          ) : undefined
        }
      />

      <Divider style={{ marginBottom: 'var(--pf-t--global--spacer--md)' }} />

      {saveSuccess && (
        <Alert
          variant="success"
          title={saveSuccess}
          isInline
          style={{ marginBottom: 'var(--pf-t--global--spacer--md)' }}
        />
      )}

      {error && (
        <Alert
          variant="danger"
          title="Failed to load cluster offerings"
          isInline
          style={{ marginBottom: 'var(--pf-t--global--spacer--md)' }}
        >
          <Button variant="link" isInline onClick={() => refetch()}>
            Retry
          </Button>
        </Alert>
      )}

      {isLoading ? (
        <Bullseye style={{ padding: 'var(--pf-t--global--spacer--2xl)' }}>
          <Spinner aria-label="Loading cluster offerings" />
        </Bullseye>
      ) : !error && (items ?? []).length === 0 ? (
        <EmptyState icon={CubesIcon}>
          <EmptyStateBody>
            {isProvider
              ? 'No cluster offerings defined yet. Create one to make it available to tenants.'
              : 'No cluster offerings are available yet. Contact your provider to publish offerings.'}
          </EmptyStateBody>
        </EmptyState>
      ) : (
        <Gallery hasGutter minWidths={{ default: '320px' }}>
          {(items ?? []).map((item) => {
            const active = activeToggle(item)
            const defaults = orgDefaults[item.id]
            const versions = item.allowedVersions ?? []
            const workerLabel = defaults?.workerCount
              ? `${defaults.workerCount} workers`
              : 'Catalog default'

            return (
              <GalleryItem key={item.id}>
                <Card
                  style={{
                    border: '1px solid var(--pf-t--global--border--color--default)',
                    borderRadius: 'var(--pf-t--global--border--radius--medium)',
                    opacity: active ? 1 : 0.6,
                    transition: 'opacity 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                  }}
                >
                  <CardHeader
                    actions={{
                      actions: (
                        <Switch
                          id={`toggle-${item.id}`}
                          isChecked={active}
                          onChange={(_e, checked) => handleToggle(item, checked)}
                          aria-label={toggleLabel(item, active)}
                        />
                      ),
                      hasNoOffset: true,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--pf-t--global--spacer--sm)',
                      }}
                    >
                      <CubesIcon
                        style={{
                          color: active
                            ? 'var(--pf-t--global--icon--color--brand)'
                            : 'var(--pf-t--global--icon--color--disabled)',
                          width: 20,
                          height: 20,
                          flexShrink: 0,
                        }}
                        aria-hidden
                      />
                      <CardTitle>{item.title}</CardTitle>
                    </div>
                  </CardHeader>

                  <CardBody style={{ flex: 1 }}>
                    {item.description && (
                      <Content
                        component="p"
                        style={{
                          color: 'var(--pf-t--global--text--color--subtle)',
                          fontSize: 'var(--pf-t--global--font--size--body--sm)',
                          marginBottom: 'var(--pf-t--global--spacer--md)',
                        }}
                      >
                        {item.description}
                      </Content>
                    )}

                    <DescriptionList isCompact isHorizontal>
                      {isProvider && item.template && (
                        <DescriptionListGroup>
                          <DescriptionListTerm>Template</DescriptionListTerm>
                          <DescriptionListDescription>
                            <code style={{ fontSize: 'var(--pf-t--global--font--size--body--sm)' }}>
                              {item.template}
                            </code>
                          </DescriptionListDescription>
                        </DescriptionListGroup>
                      )}

                      <DescriptionListGroup>
                        <DescriptionListTerm>OCP versions</DescriptionListTerm>
                        <DescriptionListDescription>
                          {versions.length > 0 ? (
                            <LabelGroup numLabels={6}>
                              {versions.map((v) => (
                                <Label key={v} color="blue" isCompact>
                                  {v}
                                </Label>
                              ))}
                            </LabelGroup>
                          ) : (
                            <span style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>
                              Not specified
                            </span>
                          )}
                        </DescriptionListDescription>
                      </DescriptionListGroup>

                      {!isProvider && (
                        <DescriptionListGroup>
                          <DescriptionListTerm>Org worker default</DescriptionListTerm>
                          <DescriptionListDescription>
                            <span
                              style={{
                                color: defaults?.workerCount
                                  ? 'var(--pf-t--global--text--color--regular)'
                                  : 'var(--pf-t--global--text--color--subtle)',
                              }}
                            >
                              {workerLabel}
                            </span>
                          </DescriptionListDescription>
                        </DescriptionListGroup>
                      )}

                      {!isProvider && defaults?.sshPublicKey && (
                        <DescriptionListGroup>
                          <DescriptionListTerm>SSH key</DescriptionListTerm>
                          <DescriptionListDescription>
                            <Label isCompact color="grey">
                              <span
                                style={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  maxWidth: 180,
                                  display: 'block',
                                }}
                              >
                                {defaults.sshPublicKey}
                              </span>
                            </Label>
                          </DescriptionListDescription>
                        </DescriptionListGroup>
                      )}

                      {isProvider && (
                        <DescriptionListGroup>
                          <DescriptionListTerm>Status</DescriptionListTerm>
                          <DescriptionListDescription>
                            <Label
                              isCompact
                              color={isPublished(item) ? 'green' : 'grey'}
                            >
                              {isPublished(item) ? 'Published' : 'Unpublished'}
                            </Label>
                          </DescriptionListDescription>
                        </DescriptionListGroup>
                      )}
                    </DescriptionList>
                  </CardBody>

                  <CardFooter>
                    <Divider style={{ marginBottom: 'var(--pf-t--global--spacer--sm)' }} />
                    {isProvider ? (
                      <Button
                        variant="link"
                        isInline
                        onClick={() =>
                          flash('Offering editor coming soon (mock mode).')
                        }
                      >
                        Edit offering
                      </Button>
                    ) : (
                      <Button variant="link" isInline onClick={() => handleEditDefaults(item)}>
                        Edit org defaults
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </GalleryItem>
            )
          })}
        </Gallery>
      )}

      {/* ── Tenant admin: edit org defaults modal ── */}
      {!isProvider && editingItem && (
        <Modal
          isOpen
          onClose={() => setEditingItem(null)}
          variant="small"
          aria-labelledby="edit-defaults-modal-title"
        >
          <ModalHeader
            title={`Org defaults — ${editingItem.title}`}
            labelId="edit-defaults-modal-title"
          />
          <ModalBody>
            <Content
              component="p"
              style={{
                color: 'var(--pf-t--global--text--color--subtle)',
                fontSize: 'var(--pf-t--global--font--size--body--sm)',
                marginBottom: 'var(--pf-t--global--spacer--md)',
              }}
            >
              These defaults pre-fill the create cluster form for your organization. Individual
              users can still override them.
            </Content>
            <Form>
              <FormGroup label="Default worker count" fieldId="default-worker-count">
                <NumberInput
                  id="default-worker-count"
                  value={editDefaults.workerCount}
                  min={1}
                  onMinus={() =>
                    setEditDefaults((d) => ({ ...d, workerCount: Math.max(1, d.workerCount - 1) }))
                  }
                  onPlus={() =>
                    setEditDefaults((d) => ({ ...d, workerCount: d.workerCount + 1 }))
                  }
                  onChange={(e) =>
                    setEditDefaults((d) => ({
                      ...d,
                      workerCount: Number((e.target as HTMLInputElement).value),
                    }))
                  }
                />
              </FormGroup>
              <FormGroup label="Default SSH public key" fieldId="default-ssh-key">
                <TextInput
                  id="default-ssh-key"
                  value={editDefaults.sshPublicKey}
                  onChange={(_e, v) => setEditDefaults((d) => ({ ...d, sshPublicKey: v }))}
                  placeholder="ssh-rsa AAAA…"
                />
              </FormGroup>
            </Form>
          </ModalBody>
          <ModalFooter>
            <Button variant="primary" onClick={handleSaveDefaults}>
              Save defaults
            </Button>
            <Button variant="link" onClick={() => setEditingItem(null)}>
              Cancel
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* ── Provider admin: create offering modal ── */}
      {isProvider && showCreateModal && (
        <Modal
          isOpen
          onClose={() => setShowCreateModal(false)}
          variant="medium"
          aria-labelledby="create-offering-title"
        >
          <ModalHeader title="Create cluster offering" labelId="create-offering-title" />
          <ModalBody>
            <Form>
              <FormGroup label="ID (slug)" isRequired fieldId="offering-id">
                <TextInput id="offering-id" placeholder="ocp-standard" />
              </FormGroup>
              <FormGroup label="Title" isRequired fieldId="offering-title">
                <TextInput id="offering-title" placeholder="OpenShift Standard" />
              </FormGroup>
              <FormGroup label="Description" fieldId="offering-description">
                <TextArea id="offering-description" placeholder="Describe this offering…" />
              </FormGroup>
              <FormGroup label="Template" fieldId="offering-template">
                <TextInput id="offering-template" placeholder="openshift-4-17" />
              </FormGroup>
              <FormGroup label="Allowed versions (comma-separated)" fieldId="offering-versions">
                <TextInput id="offering-versions" placeholder="4.17.3, 4.18.0" />
              </FormGroup>
            </Form>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="primary"
              onClick={() => {
                setShowCreateModal(false)
                flash('Offering created (demo — not persisted in mock mode).')
              }}
            >
              Create
            </Button>
            <Button variant="link" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </PageSection>
  )
}
