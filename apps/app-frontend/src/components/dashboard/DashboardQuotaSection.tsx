/**
 * flow: tenant-user-dashboard
 * step: tud_dashboard_home — resource quota section
 *
 * DonutChart cards for each quota entry (vCPU, Memory, Storage, VMs, …)
 * scoped to the signed-in tenant. Hidden for vertexa (provider has no user quota).
 *
 * Layout uses only PF primitives (Gallery, Flex) and PF design tokens.
 * No custom CSS classes — see design-system.yaml layout_and_shell.implementation_policy.
 */
import { css } from '@emotion/css'
import { useMemo } from 'react'
import { ChartDonut } from '@patternfly/react-charts/victory'
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Content,
  Flex,
  FlexItem,
  Gallery,
  GalleryItem,
  Title,
} from '@patternfly/react-core'
import { DEMO_QUOTA } from '@osac/api-contracts'
import type { DemoTenantId } from '@osac/api-contracts'

interface DashboardQuotaSectionProps {
  selectedTenant: DemoTenantId | null
}

const sectionCss = css`
  margin-top: var(--pf-t--global--spacer--xl);
`

const sectionTitleCss = css`
  margin: 0 0 var(--pf-t--global--spacer--md);
`

const quotaDetailCss = css`
  margin-top: var(--pf-t--global--spacer--sm);
  font-size: var(--pf-t--global--font--size--body--sm);
  color: var(--pf-t--global--text--color--subtle);
  text-align: center;
`

export function DashboardQuotaSection({ selectedTenant }: DashboardQuotaSectionProps) {
  const quota = useMemo(() => {
    if (!selectedTenant || selectedTenant === 'vertexa') return []
    return DEMO_QUOTA[selectedTenant] ?? []
  }, [selectedTenant])

  if (!quota.length) return null

  return (
    <section aria-label="Resource quota" className={sectionCss}>
      <Title headingLevel="h2" size="xl" className={sectionTitleCss}>
        Resource quota
      </Title>

      <Gallery hasGutter minWidths={{ default: '180px' }}>
        {quota.map((entry) => {
          const pct = entry.limit > 0 ? Math.round((entry.used / entry.limit) * 100) : 0
          const available = Math.max(0, entry.limit - entry.used)
          const usedColor = pct >= 90 ? '#C9190B' : pct >= 75 ? '#F0AB00' : '#0066CC'

          return (
            <GalleryItem key={entry.resource}>
              <Card component="article" isFullHeight>
                <CardHeader>
                  <CardTitle component="h3">{entry.resource}</CardTitle>
                </CardHeader>
                <CardBody>
                  <Flex
                    direction={{ default: 'column' }}
                    alignItems={{ default: 'alignItemsCenter' }}
                  >
                    <FlexItem>
                      {/* pf-primitive-exception: Victory SVG requires explicit pixel dimensions;
                          no PatternFly primitive can provide a chart bounding box */}
                      <ChartDonut
                        ariaDesc={`${entry.resource} quota utilization`}
                        ariaTitle={`${entry.resource}: ${pct}% used`}
                        data={[
                          { x: 'Used', y: entry.used },
                          { x: 'Available', y: available },
                        ]}
                        height={160}
                        width={160}
                        title={`${pct}%`}
                        subTitle={entry.unit}
                        colorScale={[
                          usedColor,
                          'var(--pf-t--global--background--color--secondary--default)',
                        ]}
                        padding={8}
                      />
                    </FlexItem>
                    <FlexItem>
                      <Content component="p" className={quotaDetailCss}>
                        {entry.used} / {entry.limit} {entry.unit}
                      </Content>
                    </FlexItem>
                  </Flex>
                </CardBody>
              </Card>
            </GalleryItem>
          )
        })}
      </Gallery>
    </section>
  )
}
