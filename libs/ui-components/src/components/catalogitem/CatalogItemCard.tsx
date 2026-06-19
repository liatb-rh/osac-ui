import type { CSSProperties, ComponentType } from 'react'
import { css } from '@emotion/css'
import { Button, Card, CardBody, CardFooter, Label } from '@patternfly/react-core'
import { CloudIcon } from '@patternfly/react-icons/dist/esm/icons/cloud-icon'
import { CubesIcon } from '@patternfly/react-icons/dist/esm/icons/cubes-icon'
import { ServerIcon } from '@patternfly/react-icons/dist/esm/icons/server-icon'
import type { CatalogItemType, FullCatalogItem, WorkloadProfile } from './CatalogItem'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TYPE_COLOR: Record<CatalogItemType, 'blue' | 'green' | 'orange'> = {
  vm: 'blue',
  cluster: 'green',
  baremetal: 'orange',
}

const TYPE_LABEL: Record<CatalogItemType, string> = {
  vm: 'Virtual Machine',
  cluster: 'Cluster',
  baremetal: 'Bare Metal',
}

const PROFILE_LABEL: Record<WorkloadProfile, string> = {
  'high-performance': 'High Performance',
  'machine-learning': 'ML',
  'data-processing': 'Data Processing',
  analytics: 'Analytics',
}

const TYPE_ICON_BG: Record<CatalogItemType, string> = {
  vm: 'var(--pf-t--global--background--color--info--default)',
  cluster: 'var(--pf-t--global--background--color--success--default)',
  baremetal: 'var(--pf-t--global--background--color--warning--default)',
}

const TYPE_ICON_FG: Record<CatalogItemType, string> = {
  vm: 'var(--pf-t--global--icon--color--info)',
  cluster: 'var(--pf-t--global--icon--color--success)',
  baremetal: 'var(--pf-t--global--icon--color--warning)',
}

const TYPE_ICON_COMPONENT: Record<CatalogItemType, ComponentType<{ style?: CSSProperties }>> = {
  vm: CubesIcon,
  cluster: CloudIcon,
  baremetal: ServerIcon,
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const cardCss = css`
  height: 100%;
  cursor: pointer;
  transition:
    box-shadow 0.15s ease,
    outline 0.1s;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--pf-t--global--border--color--default);
  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  }
`

const headerRowCss = css`
  display: flex;
  align-items: center;
  gap: 10px;
`

const iconBadgeCss = (type: CatalogItemType) => css`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  flex-shrink: 0;
  background: ${TYPE_ICON_BG[type]};
  color: ${TYPE_ICON_FG[type]};
  display: grid;
  place-items: center;
`

const titleCss = css`
  font-size: 0.9375rem;
  font-weight: 600;
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const descCss = css`
  margin-top: 8px;
  color: var(--pf-t--global--text--color--subtle);
  font-size: 0.8125rem;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const specRowCss = css`
  display: flex;
  gap: 14px;
  font-size: 0.8125rem;
  flex-wrap: wrap;
  margin-top: auto;
  padding-top: 10px;
  color: var(--pf-t--global--text--color--regular);
`

const specValueCss = css`
  font-weight: 700;
`

const footerCss = css`
  padding-top: 0;
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
`

// ---------------------------------------------------------------------------
// Sub-component: Icon badge (exported for reuse in drawer headers etc.)
// ---------------------------------------------------------------------------

interface CatalogItemIconProps {
  type: CatalogItemType
  /** icon name hint from the item's `icon` field, unused for now but kept for forward compat */
  icon?: string
  size?: number
}

export function CatalogItemIcon({ type, size = 36 }: CatalogItemIconProps) {
  const Icon = TYPE_ICON_COMPONENT[type]
  return (
    <div
      className={iconBadgeCss(type)}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.22) }}
    >
      <Icon style={{ fontSize: size * 0.52 }} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tag color helper — mirrors osac-pilot coloring
// ---------------------------------------------------------------------------

function tagColor(tag: string): 'purple' | 'orange' | 'blue' | 'grey' {
  if (tag === 'ai' || tag === 'gpu-accelerated') return 'purple'
  if (tag === 'gpu') return 'orange'
  if (tag === 'high-performance' || tag === 'hpc') return 'blue'
  return 'grey'
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface FullCatalogItemCardProps {
  item: FullCatalogItem
  onClick?: (item: FullCatalogItem) => void
  /** Highlight as selected (e.g. in a picker) */
  isSelected?: boolean
}

export function FullCatalogItemCard({ item, onClick, isSelected }: FullCatalogItemCardProps) {
  const defaults = item.fixedDefaults

  const specs: { label: string; value: string }[] = []
  if (defaults.cpu != null) specs.push({ label: 'vCPU', value: String(defaults.cpu) })
  if (defaults.memoryGib != null)
    specs.push({ label: 'GiB RAM', value: String(defaults.memoryGib) })
  if (defaults.bootDiskSizeGib != null)
    specs.push({ label: 'GiB disk', value: String(defaults.bootDiskSizeGib) })
  if (defaults.ocpVersion) specs.push({ label: 'OCP', value: defaults.ocpVersion })
  if (defaults.nodeProfile) specs.push({ label: defaults.nodeProfile, value: '' })

  const tags = item.tags ?? []
  const profileLabel = item.workloadProfile ? PROFILE_LABEL[item.workloadProfile] : null

  return (
    <Card
      className={cardCss}
      onClick={() => onClick?.(item)}
      isClickable={!!onClick}
      isSelected={isSelected}
      style={
        isSelected
          ? { outline: '2px solid var(--pf-t--global--border--color--brand--default)' }
          : undefined
      }
    >
      <CardBody style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header row: icon + title + type badge */}
        <div className={headerRowCss}>
          <CatalogItemIcon type={item.type} icon={item.icon} />
          <span className={titleCss}>{item.title}</span>
          <Label color={TYPE_COLOR[item.type]} isCompact>
            {TYPE_LABEL[item.type]}
          </Label>
        </div>

        {/* Description */}
        {item.description && <p className={descCss}>{item.description}</p>}

        {/* Specs row */}
        {specs.length > 0 && (
          <div className={specRowCss}>
            {specs.map((s) => (
              <div key={s.label}>
                {s.value && <span className={specValueCss}>{s.value} </span>}
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </CardBody>

      {/* Footer: workload profile + tags + create action */}
      <CardFooter className={footerCss}>
        {!item.published && (
          <Label color="orange" isCompact>
            Draft
          </Label>
        )}
        {profileLabel && (
          <Label color="grey" isCompact>
            {profileLabel}
          </Label>
        )}
        {tags.map((t) => (
          <Label key={t} color={tagColor(t)} isCompact>
            {t}
          </Label>
        ))}
        {onClick && (
          <Button
            variant="primary"
            size="sm"
            style={{ marginLeft: 'auto' }}
            onClick={(e) => {
              e.stopPropagation()
              onClick(item)
            }}
          >
            Launch
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
