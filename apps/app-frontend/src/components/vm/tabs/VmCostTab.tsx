import {
  Card,
  CardBody,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  EmptyState,
  EmptyStateBody,
  HelperText,
  HelperTextItem,
  PageSection,
  Title,
} from '@patternfly/react-core'
import type { ComputeInstance } from '@osac/api-contracts'
import {
  estimateVmMonthlyCost,
  MOCK_VM_ACTUALS,
} from '../../../utils/costUtils'

interface Props {
  vm: ComputeInstance
}

function fmt(usd: number): string {
  return `$${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function VmCostTab({ vm }: Props) {
  const actuals = MOCK_VM_ACTUALS[vm.id]
  const estimate = estimateVmMonthlyCost({
    cores: vm.spec.cores,
    memoryGib: vm.spec.memoryGib,
    bootDiskGib: vm.spec.bootDisk?.sizeGib as number | undefined,
  })

  const cost = actuals ?? estimate

  if (!cost) {
    return (
      <PageSection>
        <EmptyState>
          <EmptyStateBody>
            Cost breakdown is unavailable — VM spec data (vCPU / memory) is missing.
          </EmptyStateBody>
        </EmptyState>
      </PageSection>
    )
  }

  const isActual = actuals != null
  const label = isActual ? 'Last month (reported)' : 'Estimated (capacity-based)'

  return (
    <PageSection>
      <Card>
        <CardBody>
          <Title headingLevel="h3" size="md" style={{ marginBottom: '1rem' }}>
            Monthly cost breakdown — {label}
          </Title>

          <DescriptionList isHorizontal horizontalTermWidthModifier={{ default: '16ch' }}>
            <DescriptionListGroup>
              <DescriptionListTerm>Compute</DescriptionListTerm>
              <DescriptionListDescription>
                {fmt(cost.compute)} / mo
                {vm.spec.cores != null && vm.spec.memoryGib != null && (
                  <small style={{ marginLeft: '0.5rem', color: 'var(--pf-t--global--text--color--subtle)' }}>
                    ({vm.spec.cores} vCPU · {vm.spec.memoryGib} GiB RAM)
                  </small>
                )}
              </DescriptionListDescription>
            </DescriptionListGroup>

            <DescriptionListGroup>
              <DescriptionListTerm>Storage</DescriptionListTerm>
              <DescriptionListDescription>
                {fmt(cost.storage)} / mo
                {(vm.spec.bootDisk?.sizeGib as number | undefined) != null && (
                  <small style={{ marginLeft: '0.5rem', color: 'var(--pf-t--global--text--color--subtle)' }}>
                    ({vm.spec.bootDisk?.sizeGib as number} GiB boot disk)
                  </small>
                )}
              </DescriptionListDescription>
            </DescriptionListGroup>

            <DescriptionListGroup>
              <DescriptionListTerm>
                <strong>Total</strong>
              </DescriptionListTerm>
              <DescriptionListDescription>
                <strong>{fmt(cost.total)} / mo</strong>
              </DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>

          <HelperText style={{ marginTop: '1.25rem' }}>
            <HelperTextItem variant="indeterminate">
              {isActual
                ? 'Reported by Cost on-Prem based on prior month capacity consumption. Values may differ from the current-month estimate.'
                : 'Capacity-based estimate derived from provisioned spec. Actual costs will be reported by Cost on-Prem once integration is live.'}
            </HelperTextItem>
          </HelperText>
        </CardBody>
      </Card>
    </PageSection>
  )
}
