import { css } from '@emotion/css'
import { Card, CardBody, Content, Stack, StackItem, Title } from '@patternfly/react-core'

interface DashboardMetricCardProps {
  label: string
  value: number
}

const cardCss = css`
  min-width: 120px;
`

const valueTitleCss = css`
  margin: 0;
`

const labelCss = css`
  color: var(--pf-t--global--text--color--subtle);
`

export function DashboardMetricCard({ label, value }: DashboardMetricCardProps) {
  return (
    <Card isCompact className={cardCss}>
      <CardBody>
        <Stack>
          <StackItem>
            <Title headingLevel="h3" size="3xl" className={valueTitleCss}>
              {value}
            </Title>
          </StackItem>
          <StackItem>
            <Content component="small" className={labelCss}>
              {label}
            </Content>
          </StackItem>
        </Stack>
      </CardBody>
    </Card>
  )
}
