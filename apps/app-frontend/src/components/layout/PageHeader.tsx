import type { ReactNode } from 'react'
import { css, cx } from '@emotion/css'
import { Content, Flex, FlexItem, Title } from '@patternfly/react-core'

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  descriptionMaxWidth?: string
  actions?: ReactNode
}

const titleCss = css`
  margin: 0;
`

const descriptionBaseCss = css`
  margin: 0;
  color: var(--pf-t--global--text--color--subtle);
`

const actionsCss = css`
  flex-shrink: 0;
`

export function PageHeader({ title, description, descriptionMaxWidth, actions }: PageHeaderProps) {
  const descriptionCss = descriptionMaxWidth
    ? css`
        margin: 0;
        color: var(--pf-t--global--text--color--subtle);
        max-width: ${descriptionMaxWidth};
      `
    : descriptionBaseCss

  return (
    <Flex
      className="osac-page-toolbar-sticky"
      justifyContent={actions ? { default: 'justifyContentSpaceBetween' } : undefined}
      alignItems={actions ? { default: 'alignItemsFlexStart' } : undefined}
    >
      <FlexItem className="osac-page-toolbar-sticky__lead">
        <Title headingLevel="h1" size="2xl" className={titleCss}>
          {title}
        </Title>
        {description && (
          <Content component="p" className={descriptionCss}>
            {description}
          </Content>
        )}
      </FlexItem>
      {actions && (
        <FlexItem className={cx('osac-page-toolbar-sticky__actions', actionsCss)}>
          {actions}
        </FlexItem>
      )}
    </Flex>
  )
}
