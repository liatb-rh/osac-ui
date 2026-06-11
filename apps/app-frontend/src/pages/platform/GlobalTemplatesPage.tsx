/**
 * flow: provider-administration
 * step: pad_global_templates
 * route: /global-templates
 *
 * Provider admin view — template library. Assign backing templates to tenant groups.
 * Publishing catalog items is a tenant admin action (see AdminCatalogItemsPage).
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Label, LabelGroup, PageSection } from '@patternfly/react-core'
import { ActionsColumn } from '@patternfly/react-table'
import type { CatalogItemType } from '@osac/ui-components'
import { KpiHeader, ObjectsTable, PageHeader } from '@osac/ui-components'
import type { ObjectsTableColumn } from '@osac/ui-components'
import type { BackingTemplate } from './templatesStore'
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

export function GlobalTemplatesPage() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<BackingTemplate[]>(() => templatesStore.getAll())

  useEffect(() => {
    const unsub = templatesStore.subscribe(() => setTemplates(templatesStore.getAll()))
    return () => {
      unsub()
    }
  }, [])

  const vmCount = templates.filter((t) => t.type === 'vm').length
  const clusterCount = templates.filter((t) => t.type === 'cluster').length
  const bmCount = templates.filter((t) => t.type === 'baremetal').length
  const totalAssignments = templates.reduce((s, t) => s + t.assignedGroups.length, 0)

  const columns: ObjectsTableColumn<BackingTemplate>[] = [
    {
      label: 'Name',
      render: (t) => <strong>{t.name}</strong>,
    },
    {
      label: 'Type',
      render: (t) => (
        <Label color={TYPE_COLOR[t.type]} isCompact>
          {TYPE_LABEL[t.type]}
        </Label>
      ),
    },
    {
      label: 'Description',
      render: (t) => t.description,
    },
    {
      label: 'Assigned groups',
      render: (t) =>
        t.assignedGroups.length ? (
          <LabelGroup numLabels={3}>
            {t.assignedGroups.map((g) => (
              <Label key={g} color="blue" isCompact>
                {g}
              </Label>
            ))}
          </LabelGroup>
        ) : (
          <span style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>None</span>
        ),
    },
    {
      isActionCell: true,
      render: (t) => (
        <ActionsColumn
          items={[
            {
              title: 'View details',
              onClick: () => navigate(`/global-templates/${t.id}`),
            },
          ]}
        />
      ),
    },
  ]

  return (
    <PageSection isFilled>
      <PageHeader
        title="Global Templates"
        description="Platform template library. Assign templates to tenant groups so tenant admins can publish catalog items."
      />

      <KpiHeader
        items={[
          { label: 'Templates', value: String(templates.length) },
          { label: 'VM templates', value: String(vmCount) },
          { label: 'Cluster templates', value: String(clusterCount) },
          { label: 'Bare Metal templates', value: String(bmCount) },
          { label: 'Group assignments', value: String(totalAssignments) },
        ]}
      />

      <div style={{ marginTop: 24 }}>
        <ObjectsTable
          ariaLabel="Global templates"
          rows={templates}
          getRowKey={(t) => t.id}
          columns={columns}
          onRowClick={(t) => navigate(`/global-templates/${t.id}`)}
        />
      </div>
    </PageSection>
  )
}
