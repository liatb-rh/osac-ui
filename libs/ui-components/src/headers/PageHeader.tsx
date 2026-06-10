import type { CSSProperties, ReactNode } from 'react'
import clsx from 'clsx'
import { Content, Flex, FlexItem, Title } from '@patternfly/react-core'
import styles from './PageHeader.module.css'

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  descriptionMaxWidth?: string
  actions?: ReactNode
}

export function PageHeader({ title, description, descriptionMaxWidth, actions }: PageHeaderProps) {
  const descStyle: CSSProperties | undefined = descriptionMaxWidth
    ? { maxWidth: descriptionMaxWidth }
    : undefined

  return (
    <Flex
      className="osac-page-toolbar-sticky"
      justifyContent={actions ? { default: 'justifyContentSpaceBetween' } : undefined}
      alignItems={actions ? { default: 'alignItemsFlexStart' } : undefined}
    >
      <FlexItem className="osac-page-toolbar-sticky__lead">
        <Title headingLevel="h1" size="2xl" className={styles.title}>
          {title}
        </Title>
        {description && (
          <Content component="p" className={styles.description} style={descStyle}>
            {description}
          </Content>
        )}
      </FlexItem>
      {actions && (
        <FlexItem className={clsx('osac-page-toolbar-sticky__actions', styles.actions)}>
          {actions}
        </FlexItem>
      )}
    </Flex>
  )
}
