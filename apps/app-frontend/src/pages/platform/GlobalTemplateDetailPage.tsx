/**
 * flow: provider-administration
 * step: pad_global_template_detail
 * route: /global-templates/:id
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  EmptyState,
  EmptyStateBody,
  Form,
  FormGroup,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageBreadcrumb,
  PageSection,
  Tab,
  TabTitleText,
  Tabs,
  TextInput,
} from '@patternfly/react-core'
import { ActionsColumn } from '@patternfly/react-table'
import { PlusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon'
import type { CatalogItemType } from '@osac/ui-components'
import { ObjectsTable, PageHeader } from '@osac/ui-components'
import { templatesStore } from './templatesStore'

const TYPE_COLOR: Record<CatalogItemType, 'blue' | 'green' | 'orange'> = {
  vm: 'blue',
  cluster: 'green',
  baremetal: 'orange',
}

const TYPE_LABEL: Record<CatalogItemType, string> = {
  vm: 'VM',
  cluster: 'Cluster',
  baremetal: 'Bare Metal',
}

export function GlobalTemplateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [, forceUpdate] = useState(0)
  useEffect(() => {
    const unsub = templatesStore.subscribe(() => forceUpdate((n) => n + 1))
    return unsub
  }, [])

  const [activeTab, setActiveTab] = useState<string>('groups')
  const [addGroupOpen, setAddGroupOpen] = useState(false)
  const [newGroup, setNewGroup] = useState('')

  const template = templatesStore.getById(id ?? '')

  if (!template) {
    return (
      <PageSection isFilled>
        <p>
          Template not found: <code>{id}</code>
        </p>
        <Button variant="link" onClick={() => navigate('/global-templates')}>
          Back to Global Templates
        </Button>
      </PageSection>
    )
  }

  function handleAddGroup() {
    if (!newGroup.trim() || !template) return
    templatesStore.addGroup(template.id, newGroup.trim())
    setNewGroup('')
    setAddGroupOpen(false)
  }

  return (
    <>
      <PageBreadcrumb>
        <Breadcrumb>
          <BreadcrumbItem component="button" onClick={() => navigate('/global-templates')}>
            Global Templates
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{template.name}</BreadcrumbItem>
        </Breadcrumb>
      </PageBreadcrumb>

      <PageSection>
        <PageHeader
          title={template.name}
          description={template.description}
          actions={<Label color={TYPE_COLOR[template.type]}>{TYPE_LABEL[template.type]}</Label>}
        />
      </PageSection>

      <PageSection isFilled>
        <Tabs activeKey={activeTab} onSelect={(_e, k) => setActiveTab(String(k))}>
          <Tab eventKey="groups" title={<TabTitleText>Tenant Group Assignments</TabTitleText>}>
            <div style={{ marginTop: 16 }}>
              <div style={{ marginBottom: 12 }}>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<PlusCircleIcon />}
                  onClick={() => setAddGroupOpen(true)}
                >
                  Add group
                </Button>
              </div>

              {template.assignedGroups.length === 0 ? (
                <EmptyState>
                  <EmptyStateBody>No tenant groups assigned yet.</EmptyStateBody>
                </EmptyState>
              ) : (
                <ObjectsTable
                  ariaLabel="Assigned tenant groups"
                  rows={template.assignedGroups.map((g) => ({ group: g }))}
                  getRowKey={(r) => r.group}
                  columns={[
                    {
                      label: 'Tenant group',
                      render: (r) => (
                        <Label color="blue" isCompact>
                          {r.group}
                        </Label>
                      ),
                    },
                    {
                      isActionCell: true,
                      render: (r) => (
                        <ActionsColumn
                          items={[
                            {
                              title: 'Remove',
                              onClick: () => templatesStore.removeGroup(template.id, r.group),
                            },
                          ]}
                        />
                      ),
                    },
                  ]}
                />
              )}
            </div>
          </Tab>

          <Tab eventKey="overview" title={<TabTitleText>Overview</TabTitleText>}>
            <div style={{ marginTop: 16 }}>
              <DescriptionList isCompact columnModifier={{ default: '2Col' }}>
                <DescriptionListGroup>
                  <DescriptionListTerm>Template ID</DescriptionListTerm>
                  <DescriptionListDescription>{template.id}</DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Type</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Label color={TYPE_COLOR[template.type]} isCompact>
                      {TYPE_LABEL[template.type]}
                    </Label>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Description</DescriptionListTerm>
                  <DescriptionListDescription>{template.description}</DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Assigned groups</DescriptionListTerm>
                  <DescriptionListDescription>
                    {template.assignedGroups.length}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            </div>
          </Tab>
        </Tabs>
      </PageSection>

      <Modal
        isOpen={addGroupOpen}
        onClose={() => setAddGroupOpen(false)}
        variant="small"
        aria-label="Add tenant group"
      >
        <ModalHeader title="Assign to tenant group" />
        <ModalBody>
          <Form>
            <FormGroup label="Tenant group name" fieldId="ag-group" isRequired>
              <TextInput
                id="ag-group"
                value={newGroup}
                onChange={(_, v) => setNewGroup(v)}
                placeholder="e.g. northstar-prod"
              />
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button onClick={handleAddGroup} isDisabled={!newGroup.trim()}>
            Assign
          </Button>
          <Button variant="link" onClick={() => setAddGroupOpen(false)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}
