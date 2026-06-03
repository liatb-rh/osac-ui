import { RedhatIcon } from '@patternfly/react-icons/dist/esm/icons/redhat-icon'
import { WindowsIcon } from '@patternfly/react-icons/dist/esm/icons/windows-icon'
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Content,
  Divider,
  Flex,
  FlexItem,
  Stack,
  StackItem,
} from '@patternfly/react-core'
import type { ClusterTemplate } from '@osac/api-contracts'
import linuxMascotUrl from '../../assets/guest-os-tux-linux.png'

interface TemplateCardProps {
  template: ClusterTemplate
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
  const style = { width: 28, height: 28 } as const
  if (icon === 'windows') return <WindowsIcon style={{ ...style, color: '#0078D4' }} />
  if (icon === 'rhel') return <RedhatIcon style={{ ...style, color: '#EE0000' }} />
  return (
    <img
      src={linuxMascotUrl}
      alt=""
      width={28}
      height={28}
      style={{ display: 'block', objectFit: 'contain' }}
    />
  )
}

export function TemplateCard({ template }: TemplateCardProps) {
  const cpu = `${template.defaultCores ?? 2} vCPU`
  const memory = `${template.defaultMemoryGib ?? 8} GiB`
  const diskGib = template.defaultBootDiskSizeGib ?? 40
  const storage = `${diskGib} GiB`
  const workload = workloadLabel(template)
  const subtitle = subtitleForTemplate(template)

  return (
    <Card isClickable isFullHeight className="tenant-vm-template-card">
      <CardHeader className="tenant-vm-template-card__header">
        <CardTitle className="tenant-vm-template-card__title-block">
          <Flex
            alignItems={{ default: 'alignItemsFlexStart' }}
            spaceItems={{ default: 'spaceItemsXs' }}
          >
            <FlexItem className="tenant-vm-template-card__icon-tile">
              <OsIcon icon={template.icon} />
            </FlexItem>
            <FlexItem>
              <Stack hasGutter>
                <StackItem>
                  <Content component="h3" className="tenant-vm-template-card__title">
                    {template.title}
                  </Content>
                </StackItem>
                <StackItem>
                  <Content component="small" className="tenant-vm-template-card__subtitle">
                    {subtitle}
                  </Content>
                </StackItem>
              </Stack>
            </FlexItem>
          </Flex>
        </CardTitle>
      </CardHeader>
      <CardBody className="tenant-vm-template-card__body">
        <Stack hasGutter>
          <StackItem>
            <Flex
              className="tenant-vm-template-card__resource-row"
              justifyContent={{ default: 'justifyContentSpaceBetween' }}
            >
              <FlexItem>{cpu}</FlexItem>
              <FlexItem>{memory}</FlexItem>
              <FlexItem>{storage}</FlexItem>
            </Flex>
          </StackItem>
          <StackItem>
            <Divider />
          </StackItem>
          <StackItem>
            <Content component="small" className="tenant-vm-template-card__workload-line">
              Workload: {workload}
            </Content>
          </StackItem>
        </Stack>
      </CardBody>
    </Card>
  )
}
