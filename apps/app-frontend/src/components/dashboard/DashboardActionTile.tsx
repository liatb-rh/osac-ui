import type { ReactNode } from 'react'
import { css } from '@emotion/css'
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  Content,
  Flex,
  FlexItem,
} from '@patternfly/react-core'

interface DashboardActionTileProps {
  icon: ReactNode
  title: string
  description: string
  actionLabel: string
  onAction: () => void
}

const descriptionCss = css`
  color: var(--pf-t--global--text--color--subtle);
`

export function DashboardActionTile({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: DashboardActionTileProps) {
  return (
    <Card isFullHeight>
      <CardHeader>
        <CardTitle>
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            spaceItems={{ default: 'spaceItemsXs' }}
          >
            <FlexItem>{icon}</FlexItem>
            <FlexItem>{title}</FlexItem>
          </Flex>
        </CardTitle>
      </CardHeader>
      <CardBody>
        <Content component="p" className={descriptionCss}>
          {description}
        </Content>
      </CardBody>
      <CardFooter>
        <Button variant="link" isInline onClick={onAction}>
          {actionLabel}
        </Button>
      </CardFooter>
    </Card>
  )
}
