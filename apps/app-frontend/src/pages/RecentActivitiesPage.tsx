/**
 * flow: recent-activities
 * step: ra_activity_feed
 */
import { css } from '@emotion/css'
import { useMemo } from 'react'
import {
  Content,
  DataList,
  DataListCell,
  DataListItem,
  DataListItemCells,
  DataListItemRow,
  Label,
  PageSection,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core'
import { buildRecentActivities } from '@osac/api-contracts'
import { useComputeInstances } from '../hooks/hooks'

const pageStackCss = css`
  max-width: 800px;
`

const pageTitleCss = css`
  margin-bottom: var(--pf-t--global--spacer--lg);
`

const subtleTextCss = css`
  color: var(--pf-t--global--text--color--subtle);
`

const activityMessageCss = css`
  margin: 0;
  font-weight: var(--pf-t--global--font--weight--heading--bold);
`

const SEVERITY_COLOR: Record<string, 'green' | 'orange' | 'red' | 'blue' | 'grey'> = {
  success: 'green',
  warning: 'orange',
  danger: 'red',
  info: 'blue',
}

export function RecentActivitiesPage() {
  const { data: vms = [] } = useComputeInstances()
  const activities = useMemo(() => buildRecentActivities(vms, 30), [vms])

  return (
    <PageSection>
      <Stack className={pageStackCss}>
        <StackItem>
          <Title headingLevel="h1" size="2xl" className={pageTitleCss}>
            Recent activities
          </Title>
        </StackItem>

        <StackItem>
          {activities.length === 0 ? (
            <Content component="p" className={subtleTextCss}>
              No recent activities to display.
            </Content>
          ) : (
            <DataList aria-label="Recent activities" className="osac-activity-list">
              {activities.map((event) => (
                <DataListItem key={event.id} aria-labelledby={`activity-${event.id}`}>
                  <DataListItemRow>
                    <DataListItemCells
                      dataListCells={[
                        <DataListCell key={`severity-${event.id}`} width={1}>
                          <Label
                            color={SEVERITY_COLOR[event.severity ?? 'info'] ?? 'blue'}
                            isCompact
                            variant="outline"
                          >
                            {event.type}
                          </Label>
                        </DataListCell>,
                        <DataListCell key={`message-${event.id}`} width={4}>
                          <Content
                            id={`activity-${event.id}`}
                            component="p"
                            className={activityMessageCss}
                          >
                            {event.message ?? event.type}
                          </Content>
                          {event.relatedObjectRefs && event.relatedObjectRefs.length > 0 && (
                            <Content component="small" className={subtleTextCss}>
                              {event.relatedObjectRefs.map((r) => r.name ?? r.id).join(', ')}
                            </Content>
                          )}
                        </DataListCell>,
                        <DataListCell key={`time-${event.id}`} alignRight>
                          <Content component="small" className={subtleTextCss}>
                            {new Date(event.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            {new Date(event.timestamp).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </Content>
                        </DataListCell>,
                      ]}
                    />
                  </DataListItemRow>
                </DataListItem>
              ))}
            </DataList>
          )}
        </StackItem>
      </Stack>
    </PageSection>
  )
}
