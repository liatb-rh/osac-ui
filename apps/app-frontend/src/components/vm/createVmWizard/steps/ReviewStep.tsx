import { css, cx } from '@emotion/css'
import {
  Checkbox,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  ExpandableSection,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core'
import type { ComputeInstance } from '@osac/api-contracts'
import { type ReactNode, useMemo, useState } from 'react'
import { useComputeInstanceTemplates } from '../../../../hooks/hooks'
import {
  parseTemplateAdditionalDisksGibInput,
  parseTemplateBootDiskGibInput,
  parseTemplateCoresInput,
  parseTemplateMemoryGibInput,
  parseTemplateSecurityGroupsInput,
} from '../constants'
import type { UpdateFn, WizardState } from '../types'

const introCss = css`
  margin-top: var(--pf-t--global--spacer--sm);
  max-width: 720px;
`

/*
RESTORE for "new" path review:
function bootSourceSummary(bootSource: WizardState['bootSource']): string {
  if (bootSource === 'volume') return 'Boot volume'
  if (bootSource === 'none') return 'No boot source'
  return '—'
}
*/

export function ReviewStep({
  state,
  update,
  vms = [],
}: {
  state: WizardState
  update: UpdateFn
  vms?: ComputeInstance[]
}) {
  void vms
  const { data: templates = [] } = useComputeInstanceTemplates()
  const tpl = useMemo(
    () =>
      state.selectedTemplateId
        ? (templates.find((t) => t.id === state.selectedTemplateId) ?? null)
        : null,
    [templates, state.selectedTemplateId],
  )
  /*
  RESTORE for clone review:
  const sourceVm = state.cloneSourceVmId ? vms.find((vm) => vm.id === state.cloneSourceVmId) ?? null : null
  */

  const templateBootDiskGib = parseTemplateBootDiskGibInput(state.templateBootDiskSizeGib)
  const templateCores = parseTemplateCoresInput(state.templateCores)
  const templateMemoryGib = parseTemplateMemoryGibInput(state.templateMemoryGib)
  const additionalDisks = parseTemplateAdditionalDisksGibInput(state.templateAdditionalDisksGibRaw)
  const securityGroups = parseTemplateSecurityGroupsInput(state.templateSecurityGroupsRaw)

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  const renderSection = (id: string, title: string, content: ReactNode) => (
    <ExpandableSection
      toggleText={title}
      isExpanded={expandedSections[id] ?? true}
      onToggle={(_event, isExpanded) =>
        setExpandedSections((prev) => ({
          ...prev,
          [id]: isExpanded,
        }))
      }
    >
      {content}
    </ExpandableSection>
  )

  const renderTemplateSections = () => (
    <>
      {renderSection(
        'template-overview',
        'Overview',
        <DescriptionList isCompact>
          <DescriptionListGroup>
            <DescriptionListTerm>Template</DescriptionListTerm>
            <DescriptionListDescription>{tpl?.title ?? '—'}</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>VM name</DescriptionListTerm>
            <DescriptionListDescription>{state.templateVmName || '—'}</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>vCPU</DescriptionListTerm>
            <DescriptionListDescription>
              {templateCores != null ? String(templateCores) : '—'}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Memory</DescriptionListTerm>
            <DescriptionListDescription>
              {templateMemoryGib != null ? `${templateMemoryGib} GiB` : '—'}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Run strategy</DescriptionListTerm>
            <DescriptionListDescription>
              {state.templateRunStrategy || '—'}
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>,
      )}
      {renderSection(
        'template-storage',
        'Storage',
        <DescriptionList isCompact>
          <DescriptionListGroup>
            <DescriptionListTerm>Boot disk size</DescriptionListTerm>
            <DescriptionListDescription>
              {templateBootDiskGib != null ? `${templateBootDiskGib} GiB` : '—'}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Additional disks</DescriptionListTerm>
            <DescriptionListDescription>
              {additionalDisks && additionalDisks.length
                ? additionalDisks.map((g) => `${g} GiB`).join(', ')
                : 'None'}
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>,
      )}
      {renderSection(
        'template-network',
        'Network',
        <DescriptionList isCompact>
          <DescriptionListGroup>
            <DescriptionListTerm>Subnet</DescriptionListTerm>
            <DescriptionListDescription>
              {state.templateSubnetId.trim() || '—'}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Security groups</DescriptionListTerm>
            <DescriptionListDescription>
              {securityGroups.length ? securityGroups.join(', ') : '—'}
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>,
      )}
      {renderSection(
        'template-ssh',
        'SSH',
        <DescriptionList isCompact>
          <DescriptionListGroup>
            <DescriptionListTerm>SSH public key</DescriptionListTerm>
            <DescriptionListDescription>
              {state.templateSshPublicKey.trim() ? 'Provided' : 'None'}
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>,
      )}
      {renderSection(
        'template-initial-run',
        'Image & user data',
        <DescriptionList isCompact>
          <DescriptionListGroup>
            <DescriptionListTerm>Image</DescriptionListTerm>
            <DescriptionListDescription>
              {state.templateImageSourceType.trim() && state.templateImageSourceRef.trim()
                ? `${state.templateImageSourceType} — ${state.templateImageSourceRef}`
                : '—'}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>User data</DescriptionListTerm>
            <DescriptionListDescription>
              {state.templateUserData.trim() ? 'Provided' : 'None'}
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>,
      )}
    </>
  )

  /*
  WIZARD_TEMPLATE_ONLY — RESTORE when "new" path returns:
  const renderNewSummary = () => (
    <DescriptionList isCompact aria-labelledby="review-heading">
      <DescriptionListGroup>
        <DescriptionListTerm>Operating system</DescriptionListTerm>
        <DescriptionListDescription>{state.osTypeNew || state.osFamilyNew || '—'}</DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Boot source</DescriptionListTerm>
        <DescriptionListDescription>{bootSourceSummary(state.bootSource)}</DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>vCPU</DescriptionListTerm>
        <DescriptionListDescription>{state.cpuNew || '—'}</DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Memory</DescriptionListTerm>
        <DescriptionListDescription>{state.memoryNew ? `${state.memoryNew} GiB` : '—'}</DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Cloud-init user data</DescriptionListTerm>
        <DescriptionListDescription>{state.cloudInitUserDataNew.trim() ? 'Provided' : 'None'}</DescriptionListDescription>
      </DescriptionListGroup>
    </DescriptionList>
  )
  */

  /*
  WIZARD_TEMPLATE_ONLY — RESTORE when clone path returns (needs `const sourceVm = …` above).
  Full JSX: recover from git history before this change (search "clone-overview" in this file).
  */

  return (
    <Stack hasGutter>
      <StackItem>
        <Title id="review-heading" headingLevel="h2" size="xl">
          Review and create
        </Title>
        <Content
          component="p"
          className={cx('pf-v6-u-color-text-subtle', introCss)}
        >
          Confirm the choices below, then create the virtual machine.
        </Content>
      </StackItem>
      <StackItem>
        <Checkbox
          id="start-after"
          label="Start this virtual machine after creation"
          isChecked={state.startAfterCreate}
          onChange={(_e, v) => update('startAfterCreate', v)}
        />
      </StackItem>
      <StackItem>
        {/*
        WIZARD_TEMPLATE_ONLY — RESTORE when new + clone return:
        {state.mode === 'new' ? (
          renderNewSummary()
        ) : (
          <Stack hasGutter>
            {state.mode === 'template' && renderTemplateSections()}
            {state.mode === 'clone' && renderCloneSections()}
          </Stack>
        )}
        */}
        {renderTemplateSections()}
      </StackItem>
    </Stack>
  )
}
