import type { ReactNode } from 'react'
import { css } from '@emotion/css'
import {
  Button,
  Card,
  CardBody,
  Content,
  Flex,
  FlexItem,
  Stack,
  StackItem,
} from '@patternfly/react-core'
import { CopyIcon, EditIcon, TrashIcon } from '@patternfly/react-icons'
import type { ComputeInstance } from '@osac/api-contracts'

interface Props {
  vm: ComputeInstance
  onDelete: () => void
}

interface DangerRow {
  icon: ReactNode
  title: string
  description: string
  action: ReactNode
}

const stackCss = css`
  padding-top: var(--pf-t--global--spacer--md);
`

const rowTitleCss = css`
  margin: 0;
  font-weight: 600;
`

const rowDescriptionCss = css`
  color: var(--pf-t--global--text--color--subtle);
`

export function VmDangerZoneTab({ vm, onDelete }: Props) {
  const rows: DangerRow[] = [
    {
      icon: <EditIcon />,
      title: 'Rename virtual machine',
      description: `Change the display name of ${vm.metadata.name}.`,
      action: (
        <Button variant="secondary" isDisabled>
          Rename
        </Button>
      ),
    },
    {
      icon: <CopyIcon />,
      title: 'Clone virtual machine',
      description: 'Create an identical copy of this VM with all its volumes.',
      action: (
        <Button variant="secondary" isDisabled>
          Clone
        </Button>
      ),
    },
    {
      icon: <TrashIcon />,
      title: 'Delete virtual machine',
      description:
        'Permanently remove this VM and all attached volumes. This action cannot be undone.',
      action: (
        <Button variant="danger" onClick={onDelete}>
          Delete
        </Button>
      ),
    },
  ]

  return (
    <Stack hasGutter className={stackCss}>
      {rows.map((row) => (
        <StackItem key={row.title}>
          <Card>
            <CardBody>
              <Flex
                justifyContent={{ default: 'justifyContentSpaceBetween' }}
                alignItems={{ default: 'alignItemsCenter' }}
              >
                <FlexItem>
                  <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsMd' }}>
                    <FlexItem>{row.icon}</FlexItem>
                    <FlexItem>
                      <Stack>
                        <StackItem>
                          <Content component="p" className={rowTitleCss}>
                            {row.title}
                          </Content>
                        </StackItem>
                        <StackItem>
                          <Content component="small" className={rowDescriptionCss}>
                            {row.description}
                          </Content>
                        </StackItem>
                      </Stack>
                    </FlexItem>
                  </Flex>
                </FlexItem>
                <FlexItem>{row.action}</FlexItem>
              </Flex>
            </CardBody>
          </Card>
        </StackItem>
      ))}
    </Stack>
  )
}
