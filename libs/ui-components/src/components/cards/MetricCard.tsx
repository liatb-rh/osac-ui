import { Card, CardBody, Content, Stack, StackItem, Title } from '@patternfly/react-core'
import styles from './MetricCard.module.css'

interface MetricCardProps {
  label: string
  value: number
}

export function MetricCard({ label, value }: MetricCardProps) {
  return (
    <Card isCompact className={styles.card}>
      <CardBody>
        <Stack>
          <StackItem>
            <Title headingLevel="h3" size="3xl" className={styles.valueTitle}>
              {value}
            </Title>
          </StackItem>
          <StackItem>
            <Content component="small" className={styles.label}>
              {label}
            </Content>
          </StackItem>
        </Stack>
      </CardBody>
    </Card>
  )
}
