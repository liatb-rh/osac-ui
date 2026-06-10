import { Button } from '@patternfly/react-core'
import styles from './CustomTableLink.module.css'

export interface CustomTableLinkProps {
  children: string
  onClick: () => void
  isDisabled?: boolean
  title?: string
}

export function CustomTableLink({ children, onClick, isDisabled, title }: CustomTableLinkProps) {
  return (
    <Button
      variant="link"
      isInline
      isDisabled={isDisabled}
      title={title ?? children}
      className={styles.link}
      onClick={(e) => {
        e.stopPropagation()
        if (!isDisabled) onClick()
      }}
    >
      {children}
    </Button>
  )
}
