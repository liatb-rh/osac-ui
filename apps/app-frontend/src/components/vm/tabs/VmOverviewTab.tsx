import {
  Card,
  CardBody,
  CardTitle,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Divider,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  Stack,
  StackItem,
} from '@patternfly/react-core'
import { css } from '@emotion/css'
import type { ComputeInstance } from '@osac/api-contracts'
import { formatConditionStatusForDisplay, resolveVmOsForUi } from '@osac/api-contracts'
import { formatIsoDate } from '../../../utils/format'

interface Props {
  vm: ComputeInstance
}

const lifecycleRowCss = css`
  display: flex;
  gap: 10px;
  padding: var(--pf-t--global--spacer--sm) 0;
`

const lifecycleTimeCss = css`
  color: var(--pf-t--global--text--color--subtle);
  min-width: 5rem;
  flex-shrink: 0;
`

const gridPaddingCss = css`
  padding-top: var(--pf-t--global--spacer--md);
`

const conditionTitleCss = css`
  margin: 0;
  font-weight: 500;
`

const subtleTextCss = css`
  color: var(--pf-t--global--text--color--subtle);
`

function humanizeConditionType(type: string): string {
  return type.replace(/^CONDITION_TYPE_/i, '').replace(/_/g, ' ') || type
}

export function VmOverviewTab({ vm }: Props) {
  const osLabel =
    resolveVmOsForUi(vm) === 'rhel'
      ? 'RHEL'
      : resolveVmOsForUi(vm) === 'windows'
        ? 'Windows'
        : 'Linux'

  const MOCK_CONDITIONS: typeof vm.status.conditions = [
    {
      type: 'VMReady',
      status: 'True',
      lastTransitionTime: '2026-06-05T08:12:00Z',
      message: 'Virtual machine is ready and reachable.',
    },
    {
      type: 'AgentConnected',
      status: 'True',
      lastTransitionTime: '2026-06-05T08:11:45Z',
      message: 'Guest agent handshake completed.',
    },
    {
      type: 'NetworkAttached',
      status: 'True',
      lastTransitionTime: '2026-06-05T08:11:30Z',
      message: 'Interface eth0 bound to vn-prod.',
    },
    {
      type: 'VolumesMounted',
      status: 'True',
      lastTransitionTime: '2026-06-05T08:11:10Z',
      message: 'Boot volume and data volumes attached.',
    },
    {
      type: 'Scheduled',
      status: 'True',
      lastTransitionTime: '2026-06-05T08:10:55Z',
      message: 'Placed on worker-07 (zone us-east-1b).',
    },
    {
      type: 'ImagePulled',
      status: 'True',
      lastTransitionTime: '2026-06-05T08:10:40Z',
      message: 'Root image pulled from registry.',
    },
    {
      type: 'StorageProvisioned',
      status: 'True',
      lastTransitionTime: '2026-06-05T08:10:20Z',
      message: 'PVC bound: 100 GiB gold tier.',
    },
  ]

  const conditions =
    (vm.status.conditions?.length ?? 0) > 0 ? vm.status.conditions! : MOCK_CONDITIONS

  return (
    <Grid hasGutter className={gridPaddingCss}>
      <GridItem span={8}>
        <Card>
          <CardTitle>Configuration</CardTitle>
          <CardBody>
            <DescriptionList isHorizontal isCompact>
              <DescriptionListGroup>
                <DescriptionListTerm>Name</DescriptionListTerm>
                <DescriptionListDescription>{vm.metadata.name}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Template</DescriptionListTerm>
                <DescriptionListDescription>{vm.spec.template ?? '—'}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Operating system</DescriptionListTerm>
                <DescriptionListDescription>{osLabel}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Run strategy</DescriptionListTerm>
                <DescriptionListDescription>
                  {vm.spec.runStrategy ?? '—'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>vCPU</DescriptionListTerm>
                <DescriptionListDescription>{vm.spec.cores ?? '—'}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Memory</DescriptionListTerm>
                <DescriptionListDescription>
                  {vm.spec.memoryGib != null ? `${vm.spec.memoryGib} GiB` : '—'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              {vm.description && (
                <DescriptionListGroup>
                  <DescriptionListTerm>Description</DescriptionListTerm>
                  <DescriptionListDescription>{vm.description}</DescriptionListDescription>
                </DescriptionListGroup>
              )}
              <DescriptionListGroup>
                <DescriptionListTerm>Created</DescriptionListTerm>
                <DescriptionListDescription>
                  {vm.metadata.createdAt ? formatIsoDate(vm.metadata.createdAt) : '—'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Tenants</DescriptionListTerm>
                <DescriptionListDescription>
                  {vm.metadata.tenants?.join(', ') || '—'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Version</DescriptionListTerm>
                <DescriptionListDescription>
                  {vm.metadata.version != null ? String(vm.metadata.version) : '—'}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </CardBody>
        </Card>
      </GridItem>

      <GridItem span={4}>
        <Card isFullHeight>
          <CardTitle>Lifecycle</CardTitle>
          <CardBody>
            {conditions.length === 0 ? (
              <EmptyState variant="sm">
                <EmptyStateBody>No lifecycle events reported.</EmptyStateBody>
              </EmptyState>
            ) : (
              <Stack>
                {conditions.map((c, i) => (
                  <StackItem key={`${c.type}-${i}`}>
                    <div className={lifecycleRowCss}>
                      <Content component="small" className={lifecycleTimeCss}>
                        {formatIsoDate(c.lastTransitionTime)}
                      </Content>
                      <Flex
                        direction={{ default: 'column' }}
                        spaceItems={{ default: 'spaceItemsNone' }}
                      >
                        <FlexItem>
                          <Content component="p" className={conditionTitleCss}>
                            {humanizeConditionType(c.type)}
                          </Content>
                        </FlexItem>
                        {c.message && (
                          <FlexItem>
                            <Content component="small" className={subtleTextCss}>
                              {c.message}
                            </Content>
                          </FlexItem>
                        )}
                        <FlexItem>
                          <Content component="small" className={subtleTextCss}>
                            {formatConditionStatusForDisplay(c.status)}
                          </Content>
                        </FlexItem>
                      </Flex>
                    </div>
                    {i < conditions.length - 1 && <Divider />}
                  </StackItem>
                ))}
              </Stack>
            )}
          </CardBody>
        </Card>
      </GridItem>
    </Grid>
  )
}
