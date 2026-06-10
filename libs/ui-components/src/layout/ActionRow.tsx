import type { ReactNode } from 'react'
import clsx from 'clsx'
import { Button, Card, CardBody } from '@patternfly/react-core'
import styles from './ActionRow.module.css'

export interface ActionRowProps {
  icon: ReactNode
  title: string
  body: string
  cta: string
  tone?: 'danger'
  disabled?: boolean
  onClick?: () => void
}

export function ActionRow({ icon, title, body, cta, tone, disabled, onClick }: ActionRowProps) {
  return (
    <Card>
      <CardBody>
        <div className={styles.row}>
          <div className={styles.leftGroup}>
            <span className={clsx(tone === 'danger' && styles.iconDanger)}>{icon}</span>
            <div>
              <div className={styles.title}>{title}</div>
              <div className={styles.body}>{body}</div>
            </div>
          </div>
          <Button
            variant={tone === 'danger' ? 'danger' : 'secondary'}
            isDisabled={disabled}
            onClick={onClick}
          >
            {cta}
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}
