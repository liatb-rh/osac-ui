/**
 * flow: provider-administration
 * step: pad_org_storage_status
 * route: /resources/storage/org-storage-status
 */
import { css } from '@emotion/css'
import {
  ExpandableSection,
  Label,
  PageSection,
  Skeleton,
  Spinner,
  Title,
} from '@patternfly/react-core'
import { CheckCircleIcon } from '@patternfly/react-icons/dist/esm/icons/check-circle-icon'
import { ExclamationCircleIcon } from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon'
import { MinusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/minus-circle-icon'
import { PageHeader } from '@osac/ui-components'
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

const tierTableCss = css`
  width: 100%;
  border-collapse: collapse;
  font-size: var(--pf-v5-global--FontSize--sm);
  margin-bottom: 8px;

  th {
    text-align: left;
    padding: 6px 8px;
    font-weight: var(--pf-v5-global--FontWeight--semi-bold);
    border-bottom: 1px solid var(--pf-v5-global--BorderColor--100);
    color: var(--pf-v5-global--Color--200);
  }

  td {
    padding: 6px 8px;
    vertical-align: middle;
  }
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

function TierTable({ tiers }: { tiers: OrgStorageTierStatus[] }) {
  if (tiers.length === 0) return <p style={{ color: 'var(--pf-v5-global--Color--200)', fontSize: 'var(--pf-v5-global--FontSize--sm)' }}>No tiers configured.</p>
  return (
    <table className={tierTableCss}>
      <thead>
        <tr>
          <th>Tier</th>
          <th>Protocol</th>
          <th>Phase 1 (backend)</th>
          <th>Phase 2 (cluster)</th>
        </tr>
      </thead>
      <tbody>
        {tiers.map((t) => (
          <tr key={t.tierId}>
            <td>{t.tierName}</td>
            <td>
              {t.protocol ? (
                <Label color="cyan" isCompact>
                  {t.protocol}
                </Label>
              ) : (
                '—'
              )}
            </td>
            <td>
              <PhaseCell ready={t.phase1Ready} />
            </td>
            <td>
              <PhaseCell ready={t.phase2Ready} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
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

export function OrgStorageStatusPage() {
  const { data: statuses, isLoading, isError } = useOrgStorageStatuses()

  return (
    <>
      <PageHeader
        title="Org Storage Status"
        subtitle="Per-organization storage provisioning status: VAST backend (Phase 1) and cluster-side CSI setup (Phase 2)."
      />
      <PageSection>
        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} height="120px" />
            ))}
          </div>
        )}
        {isError && (
          <p style={{ color: 'var(--pf-v5-global--danger-color--100)' }}>
            Failed to load org storage statuses.
          </p>
        )}
        {statuses && statuses.length === 0 && (
          <p style={{ color: 'var(--pf-v5-global--Color--200)' }}>No storage status records found.</p>
        )}
        {statuses && statuses.length > 0 && (
          <div className={gridCss}>
            {statuses.map((s) => (
              <OrgStorageCard key={s.orgId} status={s} />
            ))}
          </div>
        )}
      </PageSection>
    </>
  )
}
