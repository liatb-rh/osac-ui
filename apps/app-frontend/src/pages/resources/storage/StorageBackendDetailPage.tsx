/**
 * flow: provider-administration
 * step: pad_storage_backend_detail
 * route: /resources/storage/storage-backends/:id
 */
import { useNavigate, useParams } from 'react-router-dom'
import { css } from '@emotion/css'
import {
  Breadcrumb,
  BreadcrumbItem,
  Card,
  CardBody,
  CardTitle,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  EmptyState,
  EmptyStateBody,
  Label,
  PageSection,
  Spinner,
  Title,
} from '@patternfly/react-core'
import { CheckCircleIcon } from '@patternfly/react-icons/dist/esm/icons/check-circle-icon'
import { ExclamationCircleIcon } from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon'
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import { PageHeader } from '@osac/ui-components'
import { useStorageBackends, useStorageTiers } from '../../../hooks/useAgents'

// ── Styles ───────────────────────────────────────────────────────────────────

const breadcrumbCss = css`
  margin-bottom: 12px;
`

const gridCss = css`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

const conditionRowCss = css`
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 6px 0;
  border-bottom: 1px solid var(--pf-v5-global--BorderColor--100);

  &:last-child {
    border-bottom: none;
  }
`

const conditionTypeCss = css`
  font-weight: var(--pf-v5-global--FontWeight--semi-bold);
  min-width: 140px;
  font-size: var(--pf-v5-global--FontSize--sm);
`

const conditionMsgCss = css`
  font-size: var(--pf-v5-global--FontSize--sm);
  color: var(--pf-v5-global--Color--200);
`

const DEPLOYMENT_LABELS: Record<string, string> = {
  ova: 'OVA (Virtual Appliance)',
  'voc-aws': 'VoC on AWS',
  moc: 'MOC (Mass Open Cloud)',
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function StorageBackendDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: backends, isLoading } = useStorageBackends()
  const { data: tiers } = useStorageTiers()

  const backend = backends?.find((b) => b.id === id)
  const linkedTiers = tiers?.filter((t) => t.storageBackendId === id) ?? []

  if (isLoading) {
    return (
      <PageSection>
        <Spinner aria-label="Loading backend" />
      </PageSection>
    )
  }

  if (!backend) {
    return (
      <PageSection>
        <EmptyState>
          <Title headingLevel="h4" size="lg">Backend not found</Title>
          <EmptyStateBody>No storage backend with ID &ldquo;{id}&rdquo; exists.</EmptyStateBody>
        </EmptyState>
      </PageSection>
    )
  }

  const ready = backend.status?.ready ?? false
  const conditions = backend.status?.conditions ?? []

  return (
    <>
      <PageHeader
        title={backend.metadata.name}
        subtitle={`Provider: ${backend.provider} · Endpoint: ${backend.endpoint}`}
      />
      <PageSection>
        <div className={breadcrumbCss}>
          <Breadcrumb>
            <BreadcrumbItem onClick={() => navigate('/resources/storage/storage-backends')} to="#">
              Storage Backends
            </BreadcrumbItem>
            <BreadcrumbItem isActive>{backend.metadata.name}</BreadcrumbItem>
          </Breadcrumb>
        </div>

        <div className={gridCss}>
          {/* Details card */}
          <Card>
            <CardTitle>Details</CardTitle>
            <CardBody>
              <DescriptionList isCompact>
                <DescriptionListGroup>
                  <DescriptionListTerm>Status</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Label
                      color={ready ? 'green' : 'red'}
                      icon={ready ? <CheckCircleIcon /> : <ExclamationCircleIcon />}
                      isCompact
                    >
                      {ready ? 'Ready' : 'Degraded'}
                    </Label>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Provider</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Label color="blue" isCompact>{backend.provider}</Label>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Deployment model</DescriptionListTerm>
                  <DescriptionListDescription>
                    {backend.deploymentModel
                      ? (DEPLOYMENT_LABELS[backend.deploymentModel] ?? backend.deploymentModel)
                      : '—'}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Endpoint</DescriptionListTerm>
                  <DescriptionListDescription>
                    <code>{backend.endpoint}</code>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Credentials secret</DescriptionListTerm>
                  <DescriptionListDescription>
                    <code>{backend.credentialsSecretRef}</code>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>VIP pool</DescriptionListTerm>
                  <DescriptionListDescription>{backend.vipPool}</DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Created</DescriptionListTerm>
                  <DescriptionListDescription>
                    {backend.metadata.createdAt ?? '—'}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            </CardBody>
          </Card>

          {/* Conditions card */}
          <Card>
            <CardTitle>Conditions</CardTitle>
            <CardBody>
              {conditions.length === 0 ? (
                <p style={{ color: 'var(--pf-v5-global--Color--200)', fontSize: 'var(--pf-v5-global--FontSize--sm)' }}>
                  No conditions reported.
                </p>
              ) : (
                <div>
                  {conditions.map((c, i) => (
                    <div key={i} className={conditionRowCss}>
                      <span className={conditionTypeCss}>{c.type}</span>
                      <Label
                        color={c.status === 'True' ? 'green' : c.status === 'False' ? 'red' : 'grey'}
                        isCompact
                      >
                        {c.status}
                      </Label>
                      {c.reason && (
                        <span style={{ fontStyle: 'italic', fontSize: 'var(--pf-v5-global--FontSize--sm)', color: 'var(--pf-v5-global--Color--200)' }}>
                          {c.reason}
                        </span>
                      )}
                      {c.message && <span className={conditionMsgCss}>{c.message}</span>}
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Linked tiers */}
        <Card style={{ marginTop: 16 }}>
          <CardTitle>Storage Tiers using this backend</CardTitle>
          <CardBody>
            {linkedTiers.length === 0 ? (
              <p style={{ color: 'var(--pf-v5-global--Color--200)', fontSize: 'var(--pf-v5-global--FontSize--sm)' }}>
                No tiers reference this backend.
              </p>
            ) : (
              <Table aria-label="Linked tiers" variant="compact">
                <Thead>
                  <Tr>
                    <Th>Name</Th>
                    <Th>Protocol</Th>
                    <Th>QoS class</Th>
                    <Th>VIP pool</Th>
                    <Th>Available</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {linkedTiers.map((t) => (
                    <Tr key={t.id}>
                      <Td>{t.name}</Td>
                      <Td>
                        {t.protocol ? (
                          <Label color="cyan" isCompact>{t.protocol}</Label>
                        ) : '—'}
                      </Td>
                      <Td>{t.qosClass ?? '—'}</Td>
                      <Td>{t.vipPool ?? '—'}</Td>
                      <Td>
                        <Label color={t.available ? 'green' : 'grey'} isCompact>
                          {t.available ? 'yes' : 'no'}
                        </Label>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </CardBody>
        </Card>
      </PageSection>
    </>
  )
}
