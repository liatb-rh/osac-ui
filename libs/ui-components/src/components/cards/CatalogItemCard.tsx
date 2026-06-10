import { Button, Card, CardBody, Flex, FlexItem, Label } from '@patternfly/react-core'
import styles from './CatalogItemCard.module.css'

export interface CatalogItem {
  id: string
  name: string
  template: string
  variant: string
  cpu: number
  ram: number
  presets: number
  published: boolean
}

export interface CatalogItemCardProps {
  item: CatalogItem
  onTogglePublish: (id: string, published: boolean) => void
  onEditPresets: (id: string) => void
}

export function CatalogItemCard({ item, onTogglePublish, onEditPresets }: CatalogItemCardProps) {
  return (
    <Card className={styles.card}>
      <CardBody className={styles.cardBody}>
        <Flex
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          alignItems={{ default: 'alignItemsCenter' }}
        >
          <FlexItem>
            <strong className={styles.itemName}>{item.name}</strong>
          </FlexItem>
          <FlexItem>
            <Label isCompact color={item.published ? 'green' : 'grey'}>
              {item.published ? 'published' : 'draft'}
            </Label>
          </FlexItem>
        </Flex>

        <div className={styles.templateMeta}>
          Template: <code>{item.template}</code> · variant <strong>{item.variant}</strong>
        </div>

        <Flex spaceItems={{ default: 'spaceItemsMd' }} className={styles.specsFlex}>
          <FlexItem>
            <strong>{item.cpu}</strong> vCPU
          </FlexItem>
          <FlexItem>
            <strong>{item.ram}</strong> GiB RAM
          </FlexItem>
          <FlexItem>
            <strong>{item.presets}</strong> presets
          </FlexItem>
        </Flex>

        <Flex className={styles.actionsFlex} spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>
            <Button variant="secondary" size="sm" onClick={() => onEditPresets(item.id)}>
              Edit presets
            </Button>
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
