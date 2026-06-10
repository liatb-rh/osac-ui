import { RedhatIcon } from '@patternfly/react-icons/dist/esm/icons/redhat-icon'
import { WindowsIcon } from '@patternfly/react-icons/dist/esm/icons/windows-icon'
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  Content,
  Divider,
  Flex,
  FlexItem,
  Stack,
  StackItem,
  Tooltip,
} from '@patternfly/react-core'
import type { ClusterTemplate } from '@osac/api-contracts'
import linuxMascotUrl from '../../assets/guest-os-tux-linux.png'

export interface TemplateCardProps {
  template: ClusterTemplate
  /** Highlights the card as currently selected (wizard selection mode). */
  isSelected?: boolean
  /** Called when the user clicks "Provision from template". */
  onProvision?: (template: ClusterTemplate) => void
}

function subtitleForTemplate(template: ClusterTemplate): string {
  if (template.description && template.description.trim().length > 0) {
    return template.description
  }
  return template.metadata.name
}

function workloadLabel(template: ClusterTemplate): string {
  if (!template.workloadProfile) return template.workload ?? 'General'
  if (template.workloadProfile === 'high-performance') return 'High performance'
  if (template.workloadProfile === 'machine-learning') return 'Machine learning'
  if (template.workloadProfile === 'data-processing') return 'Data processing'
  return 'Analytics'
}

function OsIcon({ icon }: { icon?: string }) {
  const style = { width: 24, height: 24, flexShrink: 0 } as const
  if (icon === 'windows') return <WindowsIcon style={{ ...style, color: '#0078D4' }} />
  if (icon === 'rhel') return <RedhatIcon style={{ ...style, color: '#EE0000' }} />
  return (
    <img
      src={linuxMascotUrl}
      alt=""
      width={24}
      height={24}
      style={{ display: 'block', objectFit: 'contain' }}
    />
  )
}

export function TemplateCard({ template, isSelected, onProvision }: TemplateCardProps) {
  const diskGib = template.defaultBootDiskSizeGib ?? 40
  const workload = workloadLabel(template)
  const subtitle = subtitleForTemplate(template)

  return (
    <Card
      isFullHeight
      isClickable={isSelected !== undefined}
      isSelected={isSelected ?? false}
      className="tenant-vm-template-card"
    >
      <CardBody className="tenant-vm-template-card__body">
        <Stack hasGutter>
          <StackItem>
            <Flex
              justifyContent={{ default: 'justifyContentSpaceBetween' }}
              alignItems={{ default: 'alignItemsCenter' }}
            >
              <FlexItem style={{ minWidth: 0, flex: '1 1 0' }}>
                <Tooltip content={template.title} position="top">
                  <Content
                    component="h3"
                    className="tenant-vm-template-card__title"
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {template.title}
                  </Content>
                </Tooltip>
              </FlexItem>
              <FlexItem style={{ flexShrink: 0 }}>
                <OsIcon icon={template.icon} />
              </FlexItem>
            </Flex>
          </StackItem>

          <StackItem>
            <Content
              component="small"
              className="tenant-vm-template-card__subtitle"
              style={{ color: 'var(--pf-t--global--text--color--subtle)' }}
            >
              {subtitle}
            </Content>
          </StackItem>

          <StackItem>
            <Flex
              className="tenant-vm-template-card__resource-row"
              spaceItems={{ default: 'spaceItemsLg' }}
            >
              <FlexItem>
                <strong>{template.defaultCores ?? 2}</strong> vCPU
              </FlexItem>
              <FlexItem>
                <strong>{template.defaultMemoryGib ?? 8}</strong> GiB RAM
              </FlexItem>
              <FlexItem>
                <strong>{diskGib}</strong> GiB disk
              </FlexItem>
            </Flex>
          </StackItem>

          <StackItem>
            <Divider />
          </StackItem>

          <StackItem>
            <Content
              component="small"
              className="tenant-vm-template-card__workload-line"
              style={{ color: 'var(--pf-t--global--text--color--subtle)' }}
            >
              Workload: {workload}
            </Content>
          </StackItem>
        </Stack>
      </CardBody>

      {onProvision && (
        <CardFooter>
          <Button
            variant="secondary"
            isBlock
            onClick={(e) => {
              e.stopPropagation()
              onProvision(template)
            }}
          >
            Provision from template
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
