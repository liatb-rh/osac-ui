import { css } from '@emotion/css'
import { EmptyState, EmptyStateBody, Label } from '@patternfly/react-core'
import type { ComputeInstance } from '@osac/api-contracts'
import { formatConditionStatusForDisplay } from '@osac/api-contracts'
import { OcTable } from '@osac/ui-components'
import type { OcTableColumn } from '@osac/ui-components'

interface Props {
  vm: ComputeInstance
}

function formatIsoDate(iso?: string): string {
  if (!iso?.trim()) return '—'
  const t = Date.parse(iso.trim())
  return Number.isNaN(t) ? iso : new Date(t).toLocaleString()
}

function humanizeType(type: string): string {
  return type.replace(/^CONDITION_TYPE_/i, '').replace(/_/g, ' ') || type
}

function conditionStatusColor(status: string): 'green' | 'red' | 'grey' {
  const s = status.toLowerCase()
  if (s.includes('true')) return 'green'
  if (s.includes('false')) return 'red'
  return 'grey'
}

type Condition = NonNullable<ComputeInstance['status']['conditions']>[number]

const tabPaddingCss = css`
  padding-top: var(--pf-t--global--spacer--md);
`

const ACTIVITY_COLUMNS: OcTableColumn<Condition>[] = [
  { label: 'When', dataLabel: 'When', render: (c) => formatIsoDate(c.lastTransitionTime) },
  { label: 'Type', dataLabel: 'Type', render: (c) => humanizeType(c.type) },
  {
    label: 'Status',
    dataLabel: 'Status',
    render: (c) => (
      <Label color={conditionStatusColor(c.status)} isCompact>
        {formatConditionStatusForDisplay(c.status)}
      </Label>
    ),
  },
  { label: 'Message', dataLabel: 'Message', render: (c) => c.message ?? c.reason ?? '—' },
]

export function VmActivityTab({ vm }: Props) {
  const conditions = [...(vm.status.conditions ?? [])].reverse()

  if (conditions.length === 0) {
    return (
      <div className={tabPaddingCss}>
        <EmptyState variant="sm">
          <EmptyStateBody>No activity reported.</EmptyStateBody>
        </EmptyState>
      </div>
    )
  }

  return (
    <div className={tabPaddingCss}>
      <OcTable
        ariaLabel="VM activity"
        columns={ACTIVITY_COLUMNS}
        rows={conditions}
        getRowKey={(c) => `${c.type}-${c.lastTransitionTime ?? ''}`}
      />
    </div>
  )
}
