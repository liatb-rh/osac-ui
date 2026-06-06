import { css } from '@emotion/css'
import { Button, Content, Flex, FlexItem } from '@patternfly/react-core'
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import { CameraIcon } from '@patternfly/react-icons/dist/esm/icons/camera-icon'
import type { ComputeInstance } from '@osac/api-contracts'

interface Props {
  vm: ComputeInstance
}

const PLACEHOLDER_SNAPSHOTS = [
  {
    name: '-pre-upgrade',
    disk: 'boot',
    size: '—',
    class: 'vast-snap',
    created: '2026-06-04 02:15',
  },
  {
    name: '-nightly-0603',
    disk: 'data-01',
    size: '500 GiB',
    class: 'vast-snap',
    created: '2026-06-03 00:00',
  },
]

const tabPaddingCss = css`
  padding-top: var(--pf-t--global--spacer--md);
`

const headerFlexCss = css`
  margin-bottom: var(--pf-t--global--spacer--md);
`

const sectionTitleCss = css`
  margin: 0;
  font-weight: 600;
`

export function VmSnapshotsTab({ vm }: Props) {
  return (
    <div className={tabPaddingCss}>
      <Flex
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
        alignItems={{ default: 'alignItemsCenter' }}
        className={headerFlexCss}
      >
        <FlexItem>
          <Content component="p" className={sectionTitleCss}>
            Volume snapshots
          </Content>
        </FlexItem>
        <FlexItem>
          <Button variant="primary" icon={<CameraIcon />} isDisabled>
            Create snapshot
          </Button>
        </FlexItem>
      </Flex>

      <Table aria-label="Volume snapshots" variant="compact">
        <Thead>
          <Tr>
            <Th>Name</Th>
            <Th>Disk</Th>
            <Th>Size</Th>
            <Th>Class</Th>
            <Th>Created</Th>
          </Tr>
        </Thead>
        <Tbody>
          {PLACEHOLDER_SNAPSHOTS.map((s) => (
            <Tr key={s.name}>
              <Td dataLabel="Name">
                <code>{`${vm.metadata.name}${s.name}`}</code>
              </Td>
              <Td dataLabel="Disk">{s.disk}</Td>
              <Td dataLabel="Size">{s.size}</Td>
              <Td dataLabel="Class">{s.class}</Td>
              <Td dataLabel="Created">{s.created}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </div>
  )
}
