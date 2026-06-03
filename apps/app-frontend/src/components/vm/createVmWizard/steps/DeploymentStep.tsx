import { BlueprintIcon } from '@patternfly/react-icons/dist/esm/icons/blueprint-icon'
import { CloneIcon } from '@patternfly/react-icons/dist/esm/icons/clone-icon'
import { DesktopIcon } from '@patternfly/react-icons/dist/esm/icons/desktop-icon'
/**
 * WIZARD_TEMPLATE_ONLY: this step is not mounted (wizard is template-only). Kept for RESTORE when
 * fulfillment supports "new" and "clone" creation methods — wire back in CreateVmWizard `renderStepBody`.
 */
import {
  Card,
  CardBody,
  CardHeader,
  Content,
  Flex,
  FlexItem,
  Label,
  Radio,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core'
import type { DeploymentMode, UpdateFn, WizardState } from '../types'

const OPTIONS: {
  value: DeploymentMode
  title: string
  description: string
  Icon: typeof DesktopIcon
}[] = [
  {
    value: 'new',
    title: 'New virtual machine',
    description: 'Define a new instance from scratch. Then configure OS, storage, and networking.',
    Icon: DesktopIcon,
  },
  {
    value: 'template',
    title: 'Create from template',
    description: 'Provision from a catalog template with recommended CPU, memory, and disk.',
    Icon: BlueprintIcon,
  },
  {
    value: 'clone',
    title: 'Clone existing VM',
    description: "Duplicate an existing virtual machine's configuration as a starting point.",
    Icon: CloneIcon,
  },
]

export function DeploymentStep({ state, update }: { state: WizardState; update: UpdateFn }) {
  return (
    <Stack hasGutter>
      <StackItem>
        <Title id="deployment-step-heading" headingLevel="h2" size="xl">
          Select a creation method
        </Title>
        <Content
          component="p"
          className="pf-v6-u-color-text-subtle"
          style={{ marginTop: 'var(--pf-t--global--spacer--sm)', maxWidth: 720 }}
        >
          Choose your preferred path to begin. We recommend creating from a template.
        </Content>
      </StackItem>
      <StackItem>
        <div
          className="osac-deploy-options"
          role="radiogroup"
          aria-labelledby="deployment-step-heading"
        >
          {OPTIONS.map((opt) => {
            const selected = state.mode === opt.value
            const Icon = opt.Icon
            return (
              <div key={opt.value} className="osac-deploy-options__cell">
                <Card
                  id={`deploy-card-${opt.value}`}
                  className="osac-deploy-options__card"
                  isCompact
                  isFullHeight
                  isClickable
                  isSelected={selected}
                  onClick={() => update('mode', opt.value)}
                  ouiaId={`deploy-option-${opt.value}`}
                  style={{
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: selected
                      ? 'var(--pf-t--global--color--brand--default)'
                      : 'var(--pf-t--global--border--color--default)',
                    borderRadius: 'var(--pf-t--global--border--radius--medium)',
                  }}
                >
                  <CardHeader style={{ flexShrink: 0 }}>
                    <Flex
                      justifyContent={{ default: 'justifyContentSpaceBetween' }}
                      alignItems={{ default: 'alignItemsFlexStart' }}
                      style={{ width: '100%' }}
                    >
                      <FlexItem>
                        <Icon
                          style={{
                            color: 'var(--pf-t--global--icon--color--subtle)',
                            width: 28,
                            height: 28,
                          }}
                        />
                      </FlexItem>
                      <FlexItem>
                        <Radio
                          id={`deploy-radio-${opt.value}`}
                          name="createVmDeploymentMethod"
                          aria-label={opt.title}
                          isChecked={selected}
                          onChange={() => update('mode', opt.value)}
                        />
                      </FlexItem>
                    </Flex>
                  </CardHeader>
                  <CardBody>
                    <Stack hasGutter style={{ flex: 1 }}>
                      <StackItem>
                        <Content
                          component="h3"
                          style={{ fontWeight: 600, margin: 0, fontSize: '1rem' }}
                        >
                          {opt.title}
                        </Content>
                      </StackItem>
                      <StackItem>
                        <div className="osac-deploy-options__badge-slot">
                          {opt.value === 'template' ? (
                            <Label color="blue" isCompact>
                              recommended
                            </Label>
                          ) : null}
                        </div>
                      </StackItem>
                      <StackItem>
                        <Content
                          component="p"
                          className="pf-v6-u-color-text-subtle"
                          style={{
                            margin: 0,
                            fontSize: 'var(--pf-t--global--font--size--body--sm)',
                          }}
                        >
                          {opt.description}
                        </Content>
                      </StackItem>
                    </Stack>
                  </CardBody>
                </Card>
              </div>
            )
          })}
        </div>
      </StackItem>
    </Stack>
  )
}
