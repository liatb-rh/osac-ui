import { css } from '@emotion/css'
import {
  Button,
  Card,
  CardBody,
  Flex,
  FlexItem,
  Label,
} from '@patternfly/react-core'
import type { CatalogItem } from './types'

const cardCss = css`
  display: flex;
  flex-direction: column;
  gap: 0;
`

const cardBodyCss = css`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const itemNameCss = css`
  font-size: 0.9375rem;
`

const templateMetaCss = css`
  font-size: 12px;
  color: var(--pf-t--global--text--color--subtle);
`

const specsFlexCss = css`
  font-size: 13px;
`

const actionsFlexCss = css`
  margin-top: auto;
  padding-top: 4px;
`

export interface CatalogItemCardProps {
  item: CatalogItem
  onTogglePublish: (id: string, published: boolean) => void
}

export function CatalogItemCard({ item, onTogglePublish }: CatalogItemCardProps) {
  return (
    <Card className={cardCss}>
      <CardBody className={cardBodyCss}>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <strong className={itemNameCss}>{item.name}</strong>
          </FlexItem>
          <FlexItem>
            <Label isCompact color={item.published ? 'green' : 'grey'}>
              {item.published ? 'published' : 'draft'}
            </Label>
          </FlexItem>
        </Flex>

        <div className={templateMetaCss}>
          Template: <code>{item.template}</code> · variant <strong>{item.variant}</strong>
        </div>

        <Flex spaceItems={{ default: 'spaceItemsMd' }} className={specsFlexCss}>
          <FlexItem><strong>{item.cpu}</strong> vCPU</FlexItem>
          <FlexItem><strong>{item.ram}</strong> GiB RAM</FlexItem>
          <FlexItem><strong>{item.presets}</strong> presets</FlexItem>
        </Flex>

        <Flex className={actionsFlexCss} spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>
            <Button variant="secondary" size="sm">Edit presets</Button>
          </FlexItem>
          <FlexItem>
            <Button
              variant="link"
              size="sm"
              onClick={() => onTogglePublish(item.id, !item.published)}
            >
              {item.published ? 'Unpublish' : 'Publish'}
            </Button>
          </FlexItem>
        </Flex>
      </CardBody>
    </Card>
  )
}
