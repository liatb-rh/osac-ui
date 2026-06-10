import { Flex, FlexItem } from '@patternfly/react-core'
import { LockIcon } from '@patternfly/react-icons/dist/esm/icons/lock-icon'
import styles from './UnavailableRow.module.css'

export function UnavailableRow({ label }: { label: string }) {
  return (
    <Flex
      spaceItems={{ default: 'spaceItemsSm' }}
      alignItems={{ default: 'alignItemsCenter' }}
      className={styles.row}
    >
      <FlexItem>
        <LockIcon aria-hidden />
      </FlexItem>
      <FlexItem>
        <em>{label} not available yet</em>
      </FlexItem>
    </Flex>
  )
}
