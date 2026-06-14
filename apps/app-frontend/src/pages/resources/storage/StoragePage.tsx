/**
 * flow: provider-administration
 * step: pad_org_storage_status
 * route: /resources/storage/org-storage-status
 */
import { css } from '@emotion/css'
import {
  ExpandableSection,
  Label,
  Skeleton,
} from '@patternfly/react-core'
import { CheckCircleIcon } from '@patternfly/react-icons/dist/esm/icons/check-circle-icon'
import { ExclamationCircleIcon } from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon'
import { MinusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/minus-circle-icon'
import { ObjectsTable, PageLayout } from '@osac/ui-components'
import type { ObjectsTableColumn } from '@osac/ui-components'
import type { OrgStorageCondition, OrgStorageStatus, OrgStorageTierStatus } from '@osac/api-contracts'
import { useOrgStorageStatuses } from '../../../hooks/useAgents'

// ── Styles ──────────────────────────────────────────────────────────────────

const gridCss = css`
  display: grid;
  gap: 16px;
`

const cardCss = css`
  background: var(--pf-v5-global--BackgroundColor--100);
  border: 1px solid var(--pf-v5-global--BorderColor--100);
  border-radius: 8px;
  padding: 16px 20px;
`

const cardHeaderCss = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`

const orgNameCss = css`
  font-size: var(--pf-v5-global--FontSize--md);
  font-weight: var(--pf-v5-global--FontWeight--semi-bold);
`


const conditionListCss = css`
  list-style: none;
  padding: 0;
  margin: 4px 0 0;
  display: grid;
  gap: 6px;
`

const conditionItemCss = css`
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: var(--pf-v5-global--FontSize--sm);
`

const conditionTypeCss = css`
  font-weight: var(--pf-v5-global--FontWeight--semi-bold);
  min-width: 140px;
`

const conditionMsgCss = css`
  color: var(--pf-v5-global--Color--200);
`

// ── Helpers ──────────────────────────────────────────────────────────────────

function ReadinessChip({ ready, label }: { ready: boolean; label: string }) {
  return (
    <Label
      color={ready ? 'green' : 'red'}
      icon={ready ? <CheckCircleIcon /> : <ExclamationCircleIcon />}
      isCompact
    >
      {label}: {ready ? 'ready' : 'not ready'}
    </Label>
  )
}

function PhaseCell({ ready }: { ready: boolean }) {
  return ready ? (
    <CheckCircleIcon color="var(--pf-v5-global--success-color--100)" title="Ready" />
  ) : (
    <MinusCircleIcon color="var(--pf-v5-global--warning-color--100)" title="Not ready" />
  )
}

const TIER_COLUMNS: ObjectsTableColumn<OrgStorageTierStatus>[] = [
  {
    label: 'Tier',
    dataLabel: 'Tier',
    render: (t) => t.tierName,
  },
  {
    label: 'Protocol',
    dataLabel: 'Protocol',
    render: (t) =>
      t.protocol ? (
        <Label color="teal" isCompact>
          {t.protocol}
        </Label>
      ) : (
        '—'
      ),
  },
  {
    label: 'Phase 1 (backend)',
    dataLabel: 'Phase 1',
    render: (t) => <PhaseCell ready={t.phase1Ready} />,
  },
  {
    label: 'Phase 2 (cluster)',
    dataLabel: 'Phase 2',
    render: (t) => <PhaseCell ready={t.phase2Ready} />,
  },
  {
    label: 'Hub Secret',
    dataLabel: 'Hub Secret',
    render: (t) =>
      t.hubSecretName ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <code style={{ fontSize: 'var(--pf-v5-global--FontSize--xs)' }}>{t.hubSecretName}</code>
          {t.hubSecretReady === true ? (
            <CheckCircleIcon color="var(--pf-v5-global--success-color--100)" title="Secret ready" />
          ) : (
            <ExclamationCircleIcon color="var(--pf-v5-global--danger-color--100)" title="Secret not ready" />
          )}
        </span>
      ) : (
        '—'
      ),
  },
]

function TierTable({ tiers }: { tiers: OrgStorageTierStatus[] }) {
  if (tiers.length === 0)
    return (
      <p style={{ color: 'var(--pf-v5-global--Color--200)', fontSize: 'var(--pf-v5-global--FontSize--sm)' }}>
        No tiers configured.
      </p>
    )
  return (
    <ObjectsTable
      ariaLabel="Tier status"
      columns={TIER_COLUMNS}
      rows={tiers}
      getRowKey={(t) => t.tierId}
    />
  )
}

function ConditionList({ conditions }: { conditions: OrgStorageCondition[] }) {
  if (conditions.length === 0) return null
  return (
    <ul className={conditionListCss}>
      {conditions.map((c, i) => (
        <li key={i} className={conditionItemCss}>
          <span className={conditionTypeCss}>{c.type}</span>
          <Label
            color={c.status === 'True' ? 'green' : c.status === 'False' ? 'red' : 'grey'}
            isCompact
          >
            {c.status}
          </Label>
          {c.reason && <span style={{ fontStyle: 'italic', color: 'var(--pf-v5-global--Color--200)' }}>{c.reason}</span>}
          {c.message && <span className={conditionMsgCss}>{c.message}</span>}
        </li>
      ))}
    </ul>
  )
}

function OrgStorageCard({ status }: { status: OrgStorageStatus }) {
  const hasIssues = !status.backendReady || !status.clusterReady
  return (
    <div className={cardCss}>
      <div className={cardHeaderCss}>
        <span className={orgNameCss}>{status.orgId}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <ReadinessChip ready={status.backendReady} label="Backend" />
          <ReadinessChip ready={status.clusterReady} label="Cluster" />
        </div>
      </div>
      <TierTable tiers={status.tiers} />
      {hasIssues && status.conditions.length > 0 && (
        <ExpandableSection toggleText="Show conditions" isIndented>
          <ConditionList conditions={status.conditions} />
        </ExpandableSection>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function StoragePage() {
  const { data: statuses, isLoading, isError } = useOrgStorageStatuses()

  return (
    <PageLayout
      title="Storage"
      description="Per-organization storage provisioning status: VAST backend (Phase 1) and cluster-side CSI setup (Phase 2)."
      error={isError ? 'Failed to load org storage statuses.' : null}
    >
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height="120px" />
          ))}
        </div>
      )}
      {!isLoading && !isError && statuses?.length === 0 && (
        <p style={{ color: 'var(--pf-v5-global--Color--200)', marginTop: 8 }}>
          No storage status records found.
        </p>
      )}
      {!isLoading && statuses && statuses.length > 0 && (
        <div className={gridCss}>
          {statuses.map((s) => (
            <OrgStorageCard key={s.orgId} status={s} />
          ))}
        </div>
      )}
    </PageLayout>
  )
}
