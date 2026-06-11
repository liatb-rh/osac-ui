import {
  Card,
  CardBody,
  CardTitle,
  ClipboardCopy,
  Flex,
  FlexItem,
  Label,
} from '@patternfly/react-core'
import { CheckCircleIcon } from '@patternfly/react-icons/dist/esm/icons/check-circle-icon'
import { InProgressIcon } from '@patternfly/react-icons/dist/esm/icons/in-progress-icon'
import { OutlinedCircleIcon } from '@patternfly/react-icons/dist/esm/icons/outlined-circle-icon'
import { css } from '@emotion/css'
import type { Cluster } from '@osac/api-contracts'

const readinessStepRowCss = css`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  position: relative;
  padding-right: 8px;
`

const readinessStepLabelCss = css`
  font-size: 13px;
`

const readinessStepLabelWeightCss = css`
  font-weight: 600;
`

const readinessStepStatusCss = css`
  color: var(--pf-t--global--text--color--subtle);
  font-size: 11px;
`

const storageTabRootCss = css`
  padding-top: 1.5rem;
  display: grid;
  gap: 1rem;
`

const readinessStepsRowCss = css`
  display: flex;
  gap: 0;
  align-items: center;
`

const sectionHeadingCss = css`
  font-size: 12px;
  font-weight: 700;
  margin: 0 0 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--pf-t--global--text--color--subtle);
`

const storageClassesGridCss = css`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 12px;
`

const codeSmCss = css`
  font-size: 0.9rem;
`

const fieldLabelCss = css`
  font-size: 11px;
  color: var(--pf-t--global--text--color--subtle);
  margin-bottom: 4px;
`

const pvcExampleLabelCss = css`
  font-size: 11px;
  color: var(--pf-t--global--text--color--subtle);
  margin: 10px 0 4px;
`

const emptyStorageClassesCss = css`
  color: var(--pf-t--global--text--color--subtle);
  font-style: italic;
  font-size: 13px;
`

const TIER_COLOR: Record<string, 'purple' | 'blue' | 'grey' | 'yellow'> = {
  fast: 'yellow',
  'tier-fast': 'yellow',
  standard: 'blue',
  'tier-standard': 'blue',
  archive: 'grey',
  'tier-archive': 'grey',
}

function pvcSnippet(storageClassName: string): string {
  const shortName = storageClassName.replace(/^vast-/, '')
  return `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: example-${shortName}
spec:
  accessModes: [ReadWriteOnce]
  storageClassName: ${storageClassName}
  resources:
    requests:
      storage: 50Gi`
}

interface StepProps {
  label: string
  done: boolean
  isCurrent: boolean
  isLast: boolean
}

function ReadinessStep({ label, done, isCurrent, isLast }: StepProps) {
  const circleCss = css`
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    background: ${done
      ? 'var(--pf-t--global--color--status--success--default)'
      : isCurrent
        ? 'var(--pf-t--global--color--status--info--background--default)'
        : 'var(--pf-t--global--background--color--secondary--default)'};
    color: ${done
      ? 'white'
      : isCurrent
        ? 'var(--pf-t--global--color--status--info--default)'
        : 'var(--pf-t--global--text--color--subtle)'};
    border: ${isCurrent ? '2px solid var(--pf-t--global--color--status--info--default)' : 'none'};
  `

  const connectorCss = css`
    position: absolute;
    right: 0;
    top: 14px;
    height: 2px;
    width: calc(100% - 36px - 140px);
    background: ${done
      ? 'var(--pf-t--global--color--status--success--default)'
      : 'var(--pf-t--global--border--color--default)'};
  `

  return (
    <div className={readinessStepRowCss}>
      <span className={circleCss}>
        {done ? <CheckCircleIcon /> : isCurrent ? <InProgressIcon /> : <OutlinedCircleIcon />}
      </span>
      <div className={readinessStepLabelCss}>
        <div className={readinessStepLabelWeightCss}>{label}</div>
        <div className={readinessStepStatusCss}>
          {done ? 'Complete' : isCurrent ? 'In progress' : 'Pending'}
        </div>
      </div>
      {!isLast && <span className={connectorCss} />}
    </div>
  )
}

interface ClusterStorageTabProps {
  cluster: Cluster
}

export function ClusterStorageTab({ cluster }: ClusterStorageTabProps) {
  const { storageReady, storage } = cluster.status
  const hasStorageClasses = (storage?.storageClasses?.length ?? 0) > 0

  const steps = [
    { label: 'Cluster provisioned', done: true },
    { label: 'Storage classes created', done: hasStorageClasses },
    { label: 'Ready for PVCs', done: storageReady === true },
  ]
  const currentIdx = steps.findIndex((s) => !s.done)

  return (
    <div className={storageTabRootCss}>
      {/* ── Storage readiness ─────────────────────────────────────────────── */}
      <Card>
        <CardTitle>Storage readiness</CardTitle>
        <CardBody>
          <div className={readinessStepsRowCss}>
            {steps.map((s, i) => (
              <ReadinessStep
                key={s.label}
                label={s.label}
                done={s.done}
                isCurrent={i === currentIdx}
                isLast={i === steps.length - 1}
              />
            ))}
          </div>
        </CardBody>
      </Card>

      {/* ── Available StorageClasses ───────────────────────────────────────── */}
      <div>
        <h3 className={sectionHeadingCss}>Available Storage Tiers</h3>

        {hasStorageClasses ? (
          <div className={storageClassesGridCss}>
            {(storage!.storageClasses ?? []).map((sc) => {
              const tier = sc.tier ?? ''
              const color = TIER_COLOR[tier] ?? 'teal'
              const displayTier = tier.replace(/^tier-/, '')
              return (
                <Card key={sc.name}>
                  <CardTitle>
                    <Flex
                      spaceItems={{ default: 'spaceItemsSm' }}
                      alignItems={{ default: 'alignItemsCenter' }}
                      justifyContent={{ default: 'justifyContentSpaceBetween' }}
                    >
                      <FlexItem>
                        <code className={codeSmCss}>{sc.name}</code>
                      </FlexItem>
                      <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                        {sc.isDefault && (
                          <FlexItem>
                            <Label color="yellow" isCompact>
                              default
                            </Label>
                          </FlexItem>
                        )}
                        {displayTier && (
                          <FlexItem>
                            <Label color={color} isCompact>
                              {displayTier}
                            </Label>
                          </FlexItem>
                        )}
                      </Flex>
                    </Flex>
                  </CardTitle>
                  <CardBody>
                    <div className={fieldLabelCss}>storageClassName</div>
                    <ClipboardCopy
                      isReadOnly
                      hoverTip="Copy"
                      clickTip="Copied"
                      aria-label={`Copy ${sc.name}`}
                      variant="inline-compact"
                    >
                      {sc.name}
                    </ClipboardCopy>
                    <div className={pvcExampleLabelCss}>PVC example</div>
                    <ClipboardCopy
                      isReadOnly
                      isCode
                      isExpanded
                      hoverTip="Copy PVC"
                      clickTip="Copied"
                      aria-label={`Copy PVC for ${sc.name}`}
                    >
                      {pvcSnippet(sc.name)}
                    </ClipboardCopy>
                  </CardBody>
                </Card>
              )
            })}
          </div>
        ) : (
          <p className={emptyStorageClassesCss}>
            Storage tiers will appear here once the cluster is fully provisioned.
          </p>
        )}
      </div>
    </div>
  )
}
