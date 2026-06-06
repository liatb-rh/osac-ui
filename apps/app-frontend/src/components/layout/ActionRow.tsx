import type { ReactNode } from 'react'
import { css } from '@emotion/css'
import { Button, Card, CardBody } from '@patternfly/react-core'

const rowCss = css`
  display: flex;
  align-items: center;
  gap: 16px;
  justify-content: space-between;
`

const leftGroupCss = css`
  display: flex;
  gap: 12px;
  align-items: center;
`

const titleCss = css`
  font-weight: 600;
`

const bodyCss = css`
  color: var(--pf-t--global--text--color--subtle);
  font-size: 13px;
`

export interface ActionRowProps {
  icon: ReactNode
  title: string
  body: string
  cta: string
  tone?: 'danger'
  onClick?: () => void
}

export function ActionRow({ icon, title, body, cta, tone, onClick }: ActionRowProps) {
  const iconCss = css`
    color: ${tone === 'danger' ? 'var(--pf-t--global--color--status--danger--default)' : 'inherit'};
  `

  return (
    <Card>
      <CardBody>
        <div className={rowCss}>
          <div className={leftGroupCss}>
            <span className={iconCss}>{icon}</span>
            <div>
              <div className={titleCss}>{title}</div>
              <div className={bodyCss}>{body}</div>
            </div>
          </div>
          <Button variant={tone === 'danger' ? 'danger' : 'secondary'} onClick={onClick}>
            {cta}
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}
