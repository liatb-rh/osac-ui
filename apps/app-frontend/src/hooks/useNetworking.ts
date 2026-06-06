import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createPublicIP,
  createSecurityGroup,
  createSubnet,
  createVirtualNetwork,
  deletePublicIP,
  deleteSecurityGroup,
  deleteSubnet,
  deleteVirtualNetwork,
  listNetworkClasses,
  listPublicIPPools,
  listPublicIPs,
  listSecurityGroups,
  listSubnets,
  listVirtualNetworks,
  updatePublicIP,
} from '../api/networkClient'
import type {
  AllocatePublicIPParams,
  CreateSecurityGroupParams,
  CreateSubnetParams,
  CreateVirtualNetworkParams,
} from '../api/networkClient'

export const networkQueryKeys = {
  virtualNetworks: ['virtual_networks'] as const,
  subnets: (virtualNetworkId?: string) => ['subnets', virtualNetworkId ?? ''] as const,
  securityGroups: ['security_groups'] as const,
  networkClasses: ['network_classes'] as const,
  publicIPs: ['public_ips'] as const,
  publicIPPolling: ['public_ips', 'polling'] as const,
  publicIPPools: ['public_ip_pools'] as const,
}

const PUBLIC_IP_POLL_MS = 5_000

// ---------------------------------------------------------------------------
// VirtualNetwork hooks
// ---------------------------------------------------------------------------

export function useVirtualNetworks() {
  return useQuery({
    queryKey: networkQueryKeys.virtualNetworks,
    queryFn: listVirtualNetworks,
    staleTime: 60_000,
    select: (data) => data.items,
  })
}

export function useCreateVirtualNetwork() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: CreateVirtualNetworkParams) => createVirtualNetwork(params),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: networkQueryKeys.virtualNetworks })
    },
  })
}

export function useDeleteVirtualNetwork() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteVirtualNetwork(id),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: networkQueryKeys.virtualNetworks })
      await qc.refetchQueries({ queryKey: ['subnets'] })
      await qc.refetchQueries({ queryKey: networkQueryKeys.securityGroups })
    },
  })
}

// ---------------------------------------------------------------------------
// Subnet hooks
// ---------------------------------------------------------------------------

export function useSubnets(virtualNetworkId?: string) {
  return useQuery({
    queryKey: networkQueryKeys.subnets(virtualNetworkId),
    queryFn: () => listSubnets(virtualNetworkId),
    staleTime: 30_000,
    select: (data) => data.items,
  })
}

export function useAllSubnets() {
  return useQuery({
    queryKey: networkQueryKeys.subnets(),
    queryFn: () => listSubnets(),
    staleTime: 30_000,
    select: (data) => data.items,
  })
}

export function useCreateSubnet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: CreateSubnetParams) => createSubnet(params),
    onSuccess: async (_data, variables) => {
      await qc.refetchQueries({ queryKey: networkQueryKeys.subnets(variables.virtualNetworkId) })
      await qc.refetchQueries({ queryKey: networkQueryKeys.subnets() })
    },
  })
}

export function useDeleteSubnet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSubnet(id),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ['subnets'] })
    },
  })
}

// ---------------------------------------------------------------------------
// SecurityGroup hooks
// ---------------------------------------------------------------------------

export function useSecurityGroups() {
  return useQuery({
    queryKey: networkQueryKeys.securityGroups,
    queryFn: listSecurityGroups,
    staleTime: 60_000,
    select: (data) => data.items,
  })
}

export function useCreateSecurityGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: CreateSecurityGroupParams) => createSecurityGroup(params),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: networkQueryKeys.securityGroups })
    },
  })
}

export function useDeleteSecurityGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSecurityGroup(id),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: networkQueryKeys.securityGroups })
    },
  })
}

// ---------------------------------------------------------------------------
// NetworkClass hooks
// ---------------------------------------------------------------------------

export function useNetworkClasses() {
  return useQuery({
    queryKey: networkQueryKeys.networkClasses,
    queryFn: listNetworkClasses,
    staleTime: 5 * 60_000,
    select: (data) => data.items,
  })
}

// ---------------------------------------------------------------------------
// PublicIP hooks
// ---------------------------------------------------------------------------

export function usePublicIPs() {
  return useQuery({
    queryKey: networkQueryKeys.publicIPs,
    queryFn: listPublicIPs,
    staleTime: 10_000,
    refetchOnMount: 'always',
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? []
      const hasTransitioning = items.some(
        (ip) =>
          ip.status.state === 'PUBLIC_IP_STATE_PENDING' ||
          ip.status.state === 'PUBLIC_IP_STATE_ATTACHING' ||
          ip.status.state === 'PUBLIC_IP_STATE_RELEASING',
      )
      return hasTransitioning ? PUBLIC_IP_POLL_MS : false
    },
    select: (data) => data.items,
  })
}

export function useAllocatePublicIP() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: AllocatePublicIPParams) => createPublicIP(params),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: networkQueryKeys.publicIPs })
    },
  })
}

export function useAttachPublicIP() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, computeInstanceId }: { id: string; computeInstanceId: string }) =>
      updatePublicIP(id, computeInstanceId),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: networkQueryKeys.publicIPs })
    },
  })
}

export function useDetachPublicIP() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => updatePublicIP(id, null),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: networkQueryKeys.publicIPs })
    },
  })
}

export function useDeletePublicIP() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePublicIP(id),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: networkQueryKeys.publicIPs })
    },
  })
}

export function usePublicIPPools() {
  return useQuery({
    queryKey: networkQueryKeys.publicIPPools,
    queryFn: listPublicIPPools,
    staleTime: 5 * 60_000,
    select: (data) => data.items,
  })
}
