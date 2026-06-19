/**
 * flow: manage-networks
 * step: net_topology_tab
 * route: /networks
 */
import { type FC, useCallback, useEffect, useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
import { css } from '@emotion/css'
import {
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  FormSelect,
  FormSelectOption,
  PageSection,
  Tab,
  TabTitleText,
  Tabs,
  Title,
} from '@patternfly/react-core'
import type { Edge, Node } from '@patternfly/react-topology'
import {
  DagreLayout,
  DefaultNode,
  GRAPH_LAYOUT_END_EVENT,
  GraphComponent,
  Model,
  ModelKind,
  TopologyControlBar,
  TopologyView,
  Visualization,
  VisualizationProvider,
  VisualizationSurface,
  createTopologyControlButtons,
  defaultControlButtonsOptions,
  observer,
  useVisualizationController,
} from '@patternfly/react-topology'
import '@patternfly/react-topology/dist/esm/css/topology-components.css'
import type { Subnet, VirtualNetwork } from '@osac/api-contracts'
import { useComputeInstances } from '../../../hooks/hooks'
import { useAllSubnets, useVirtualNetworks } from '../../../hooks/useNetworking'
import { PageHeader } from '@osac/ui-components'
import { VirtualNetworksTab } from './virtual-networks/VirtualNetworksTab'
import { SubnetsTab } from './subnets/SubnetsTab'
import { SecurityGroupsTab } from './security-groups/SecurityGroupsTab'

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const tabContentCss = css`
  padding-top: 1rem;
`

const tabHeadingCss = css`
  margin-bottom: 0.75rem;
`

const topologyEmptyStateCss = css`
  margin-top: 2rem;
`

const topologyHeaderCss = css`
  margin-bottom: 0.75rem;
  gap: 1rem;
`

const vnSelectCss = css`
  min-width: 180px;
`

const topologyCanvasCss = css`
  height: 480px;
  border: 1px solid var(--pf-t--global--border--color--default);
  border-radius: var(--pf-t--global--border--radius--medium);
  overflow: hidden;
  background: var(--pf-t--global--background--color--secondary--default);
`

const topoNodeGroupCss = css`
  cursor: default;
`

const topoNodeRectCss = css`
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.07));
`

// ---------------------------------------------------------------------------
// Topology — node constants and custom renderers
// ---------------------------------------------------------------------------

const NODE_W = 164
const NODE_H = 50

interface TopoNodeData {
  description: string
  nodeType: 'vnet' | 'subnet' | 'vm'
}

const DOT_COLOR: Record<string, string> = {
  vnet: '#0066cc',
  subnet: '#3e8635',
  vm: '#f0ab00',
}

const OsacTopoNode: FC<{ element: Node }> = observer(({ element }) => {
  const data = element.getData() as TopoNodeData
  const { width, height } = element.getDimensions()
  const pos = element.getPosition()
  const dot = DOT_COLOR[data.nodeType] ?? '#0066cc'

  return (
    <g
      transform={`translate(${pos.x - width / 2}, ${pos.y - height / 2})`}
      className={topoNodeGroupCss}
    >
      <rect
        width={width}
        height={height}
        rx={8}
        ry={8}
        fill="white"
        stroke="#cfe1f5"
        strokeWidth={1.5}
        className={topoNodeRectCss}
      />
      <circle cx={16} cy={height / 2} r={5} fill={dot} />
      <text x={30} y={height / 2 - 6} fontSize={12} fontWeight={600} fill="#0b1b2b">
        {element.getLabel()}
      </text>
      <text x={30} y={height / 2 + 10} fontSize={11} fill="#6a6e73">
        {data.description}
      </text>
    </g>
  )
})

const OsacTopoEdge: FC<{ element: Edge }> = observer(({ element }) => {
  const start = element.getStartPoint()
  const end = element.getEndPoint()
  const bends = element.getBendpoints()

  let d = `M ${start.x},${start.y}`
  bends.forEach((p) => {
    d += ` L ${p.x},${p.y}`
  })
  d += ` L ${end.x},${end.y}`

  return <path d={d} stroke="#cfe1f5" strokeWidth={2} fill="none" />
})

function buildTopologyModel(
  vn: VirtualNetwork,
  subnets: Subnet[],
  vms: ReturnType<typeof useComputeInstances>['data'],
): Model {
  const nodes: Model['nodes'] = []
  const edges: Model['edges'] = []
  const allVms = vms ?? []

  const vnSubnets = subnets.filter((s) => s.spec.virtualNetwork === vn.id)

  nodes.push({
    id: `vn-${vn.id}`,
    type: 'vnet',
    label: vn.metadata.name,
    width: NODE_W,
    height: NODE_H,
    data: {
      description: vn.spec.ipv4Cidr ?? vn.spec.ipv6Cidr ?? '',
      nodeType: 'vnet',
    } satisfies TopoNodeData,
  })

  for (const sn of vnSubnets) {
    nodes.push({
      id: `sn-${sn.id}`,
      type: 'subnet',
      label: sn.metadata.name,
      width: NODE_W,
      height: NODE_H,
      data: {
        description: sn.spec.ipv4Cidr ?? sn.spec.ipv6Cidr ?? '',
        nodeType: 'subnet',
      } satisfies TopoNodeData,
    })
    edges.push({
      id: `e-vn-sn-${sn.id}`,
      type: 'edge',
      source: `vn-${vn.id}`,
      target: `sn-${sn.id}`,
    })

    const snVms = allVms.filter((vm) => vm.spec.subnet === sn.metadata.name)
    for (const vm of snVms) {
      nodes.push({
        id: `vm-${vm.id}`,
        type: 'vm',
        label: vm.metadata.name,
        width: NODE_W,
        height: NODE_H,
        data: {
          description: `VM · ${vm.status.ipAddress ?? '—'}`,
          nodeType: 'vm',
        } satisfies TopoNodeData,
      })
      edges.push({
        id: `e-sn-vm-${vm.id}`,
        type: 'edge',
        source: `sn-${sn.id}`,
        target: `vm-${vm.id}`,
      })
    }
  }

  return {
    graph: { id: 'g1', type: ModelKind.graph, layout: 'Dagre' },
    nodes,
    edges,
  }
}

function TopologyInner({ model }: { model: Model }) {
  const controller = useVisualizationController()
  const [layoutDone, setLayoutDone] = useState(false)

  useEffect(() => {
    controller.fromModel(model, false)
    controller.addEventListener(GRAPH_LAYOUT_END_EVENT, () => setLayoutDone(true))
    controller.getGraph().layout()
  }, [controller, model])

  const controlButtons = createTopologyControlButtons({
    ...defaultControlButtonsOptions,
    zoomInCallback: () => controller.getGraph().scaleBy(4 / 3),
    zoomOutCallback: () => controller.getGraph().scaleBy(3 / 4),
    fitToScreenCallback: () => controller.getGraph().fit(80),
    resetViewCallback: () => {
      controller.getGraph().reset()
      controller.getGraph().layout()
    },
  })

  return (
    <TopologyView controlBar={<TopologyControlBar controlButtons={controlButtons} />}>
      <VisualizationSurface state={{ layoutDone }} />
    </TopologyView>
  )
}

function NetworkTopologyTab() {
  const { data: vns = [] } = useVirtualNetworks()
  const { data: allSubnets = [] } = useAllSubnets()
  const { data: vms } = useComputeInstances()
  const [selectedVnId, setSelectedVnId] = useState<string>('')

  const activeVn = vns.find((vn) => vn.id === (selectedVnId || vns[0]?.id))

  const model = useMemo(
    () => (activeVn ? buildTopologyModel(activeVn, allSubnets, vms) : null),
    [activeVn, allSubnets, vms],
  )

  const controller = useMemo(() => {
    const c = new Visualization()
    c.registerLayoutFactory(
      (_type, graph) =>
        new DagreLayout(graph, {
          rankdir: 'LR',
          ranksep: 100,
          nodesep: 40,
          marginx: 30,
          marginy: 30,
        }),
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c.registerComponentFactory((_kind, type): any => {
      if (type === ModelKind.graph) return GraphComponent
      if (type === 'edge') return OsacTopoEdge
      if (type === 'vnet' || type === 'subnet' || type === 'vm') return OsacTopoNode
      return DefaultNode
    })
    return c
  }, [])

  if (vns.length === 0) {
    return (
      <EmptyState className={topologyEmptyStateCss}>
        <EmptyStateBody>No virtual networks found. Create one to view the topology.</EmptyStateBody>
      </EmptyState>
    )
  }

  return (
    <div className={tabContentCss}>
      <Flex alignItems={{ default: 'alignItemsCenter' }} className={topologyHeaderCss}>
        <FlexItem>
          <Title headingLevel="h3" size="md">
            Topology{activeVn ? ` — ${activeVn.metadata.name}` : ''}
          </Title>
        </FlexItem>
        {vns.length > 1 && (
          <FlexItem>
            <FormSelect
              value={selectedVnId || vns[0]?.id}
              onChange={(_e, val) => setSelectedVnId(val)}
              aria-label="Select virtual network"
              className={vnSelectCss}
            >
              {vns.map((vn) => (
                <FormSelectOption key={vn.id} value={vn.id} label={vn.metadata.name} />
              ))}
            </FormSelect>
          </FlexItem>
        )}
      </Flex>
      <div className={topologyCanvasCss}>
        {model && (
          <VisualizationProvider controller={controller}>
            <TopologyInner model={model} />
          </VisualizationProvider>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page — tab container
// ---------------------------------------------------------------------------

type ActiveTab = 0 | 1 | 2 | 3

export function NetworksPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>(0)

  const handleTabSelect = useCallback((_e: MouseEvent, key: string | number) => {
    setActiveTab(key as ActiveTab)
  }, [])

  return (
    <PageSection isFilled>
      <PageHeader
        title="Networks"
        description="Virtual networks, subnets, and topology for your tenant."
      />
      <Tabs activeKey={activeTab} onSelect={handleTabSelect} aria-label="Networks tabs">
        <Tab eventKey={0} title={<TabTitleText>Topology</TabTitleText>}>
          <div className={tabContentCss}>
            <Title headingLevel="h3" size="md" className={tabHeadingCss}>
              Network topology
            </Title>
            <NetworkTopologyTab />
          </div>
        </Tab>
        <Tab eventKey={1} title={<TabTitleText>Virtual Networks</TabTitleText>}>
          <div className={tabContentCss}>
            <VirtualNetworksTab />
          </div>
        </Tab>
        <Tab eventKey={2} title={<TabTitleText>Subnets</TabTitleText>}>
          <div className={tabContentCss}>
            <SubnetsTab />
          </div>
        </Tab>
        <Tab eventKey={3} title={<TabTitleText>Security Groups</TabTitleText>}>
          <div className={tabContentCss}>
            <SecurityGroupsTab />
          </div>
        </Tab>
      </Tabs>
    </PageSection>
  )
}
