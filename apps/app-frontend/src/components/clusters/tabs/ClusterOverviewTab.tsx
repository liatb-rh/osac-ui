import {
  Alert,
  Button,
  Card,
  CardBody,
  CardTitle,
  ClipboardCopy,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  Label,
  LabelGroup,
} from '@patternfly/react-core'
import { ExternalLinkAltIcon } from '@patternfly/react-icons/dist/esm/icons/external-link-alt-icon'
import { css } from '@emotion/css'
import type { Cluster, ClusterCatalogItem } from '@osac/api-contracts'
import { UnavailableRow, formatDate } from './utils'

const STATUS_BORDER: Record<string, string> = {
  CLUSTER_STATE_READY: 'var(--pf-t--global--color--status--success--default)',
  CLUSTER_STATE_FAILED: 'var(--pf-t--global--color--status--danger--default)',
  CLUSTER_STATE_UPGRADE_FAILED: 'var(--pf-t--global--color--status--danger--default)',
  CLUSTER_STATE_PROGRESSING: 'var(--pf-t--global--color--status--info--default)',
  CLUSTER_STATE_UPGRADING: 'var(--pf-t--global--color--status--info--default)',
  CLUSTER_STATE_UNSPECIFIED: 'var(--pf-t--global--border--color--default)',
}

const overviewTabRootCss = css`
  padding-top: 1.5rem;
`

const alertMarginCss = css`
  margin-bottom: 1.25rem;
`

const cardFullHeightCss = css`
  height: 100%;
`

const codeSmCss = css`
  font-size: 0.85rem;
`

interface ClusterOverviewTabProps {
  cluster: Cluster
  catalogItem: ClusterCatalogItem | undefined
}

export function ClusterOverviewTab({ cluster, catalogItem }: ClusterOverviewTabProps) {
  const labelEntries = Object.entries(cluster.metadata.labels ?? {})
  const statusBorder =
    STATUS_BORDER[cluster.status.state] ?? STATUS_BORDER.CLUSTER_STATE_UNSPECIFIED

  const activeCondition = cluster.status.conditions?.find(
    (c) =>
      (c.type === 'CLUSTER_CONDITION_TYPE_FAILED' && c.status === 'CONDITION_STATUS_TRUE') ||
      (c.type === 'CLUSTER_CONDITION_TYPE_DEGRADED' && c.status === 'CONDITION_STATUS_TRUE'),
  )

  const apiServer =
    cluster.status.apiUrl ?? `https://api.${cluster.metadata.name}.osac.internal:6443`
  const consoleUrl =
    cluster.status.consoleUrl ?? `https://console.${cluster.metadata.name}.osac.internal`
  const podCidr = cluster.spec.network?.podCidr ?? '10.128.0.0/14'
  const serviceCidr = cluster.spec.network?.serviceCidr ?? '172.30.0.0/16'

  const configCardCss = css`
    border-top: 3px solid ${statusBorder};
    height: 100%;
  `

  return (
    <div className={overviewTabRootCss}>
      {activeCondition && (
        <Alert
          isInline
          variant={activeCondition.type.includes('FAILED') ? 'danger' : 'warning'}
          title={
            activeCondition.reason ?? activeCondition.type.replace('CLUSTER_CONDITION_TYPE_', '')
          }
          className={alertMarginCss}
        >
          {activeCondition.message}
        </Alert>
      )}

      <Grid hasGutter>
        {/* ── Configuration ─────────────────────────────────────────────── */}
        <GridItem md={7}>
          <Card className={configCardCss}>
            <CardTitle>Cluster configuration</CardTitle>
            <CardBody>
              <DescriptionList isHorizontal isCompact columnModifier={{ default: '1Col' }}>
                <DescriptionListGroup>
                  <DescriptionListTerm>API server</DescriptionListTerm>
                  <DescriptionListDescription>
                    <code className={codeSmCss}>{apiServer}</code>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Console</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Flex
                      spaceItems={{ default: 'spaceItemsSm' }}
                      alignItems={{ default: 'alignItemsCenter' }}
                    >
                      <FlexItem>
                        <code className={codeSmCss}>{consoleUrl}</code>
                      </FlexItem>
                      {cluster.status.consoleUrl && (
                        <FlexItem>
                          <Button
                            variant="link"
                            isInline
                            icon={<ExternalLinkAltIcon />}
                            component="a"
                            href={cluster.status.consoleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Open console"
                          />
                        </FlexItem>
                      )}
                    </Flex>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Created</DescriptionListTerm>
                  <DescriptionListDescription>
                    {formatDate(cluster.metadata.createdAt)}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                {catalogItem && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>Template</DescriptionListTerm>
                    <DescriptionListDescription>{catalogItem.title}</DescriptionListDescription>
                  </DescriptionListGroup>
                )}
                <DescriptionListGroup>
                  <DescriptionListTerm>Pod CIDR</DescriptionListTerm>
                  <DescriptionListDescription>
                    <code className={codeSmCss}>{podCidr}</code>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Service CIDR</DescriptionListTerm>
                  <DescriptionListDescription>
                    <code className={codeSmCss}>{serviceCidr}</code>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                {labelEntries.length > 0 && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>Labels</DescriptionListTerm>
                    <DescriptionListDescription>
                      <LabelGroup numLabels={6}>
                        {labelEntries.map(([k, v]) => (
                          <Label key={k} color="blue" isCompact>
                            {v ? `${k}=${v}` : k}
                          </Label>
                        ))}
                      </LabelGroup>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                )}
              </DescriptionList>
            </CardBody>
          </Card>
        </GridItem>

        {/* ── Access ────────────────────────────────────────────────────── */}
        <GridItem md={5}>
          <Card className={cardFullHeightCss}>
            <CardTitle>Access</CardTitle>
            <CardBody>
              <DescriptionList isCompact columnModifier={{ default: '1Col' }}>
                <DescriptionListGroup>
                  <DescriptionListTerm>API URL</DescriptionListTerm>
                  <DescriptionListDescription>
                    {cluster.status.apiUrl ? (
                      <ClipboardCopy
                        isReadOnly
                        isCode
                        hoverTip="Copy API URL"
                        clickTip="Copied"
                        aria-label="Copy API URL"
                      >
                        {cluster.status.apiUrl}
                      </ClipboardCopy>
                    ) : (
                      <UnavailableRow label="API URL" />
                    )}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Console URL</DescriptionListTerm>
                  <DescriptionListDescription>
                    {cluster.status.consoleUrl ? (
                      <Flex
                        direction={{ default: 'column' }}
                        spaceItems={{ default: 'spaceItemsSm' }}
                      >
                        <FlexItem>
                          <Button
                            variant="link"
                            isInline
                            icon={<ExternalLinkAltIcon />}
                            iconPosition="end"
                            component="a"
                            href={cluster.status.consoleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Open console
                          </Button>
                        </FlexItem>
                        <FlexItem>
                          <ClipboardCopy
                            isReadOnly
                            isCode
                            hoverTip="Copy console URL"
                            clickTip="Copied"
                            aria-label="Copy console URL"
                          >
                            {cluster.status.consoleUrl}
                          </ClipboardCopy>
                        </FlexItem>
                      </Flex>
                    ) : (
                      <UnavailableRow label="Console URL" />
                    )}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            </CardBody>
          </Card>
        </GridItem>
      </Grid>
    </div>
  )
}
