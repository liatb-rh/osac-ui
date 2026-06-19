import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  BareMetalInstanceCatalogItem,
  FulfillmentBareMetalInstance,
} from '@osac/api-contracts'
import {
  createBareMetalInstance,
  listBareMetalCatalogItems,
  listBareMetalInstances,
} from '../api/client'

export const bareMetalQueryKeys = {
  list: ['bare_metal_instances'] as const,
  catalogItems: ['bare_metal_instance_catalog_items'] as const,
}

export function useBareMetalInstances() {
  return useQuery({
    queryKey: bareMetalQueryKeys.list,
    queryFn: () => listBareMetalInstances(),
    staleTime: 30_000,
    refetchOnMount: 'always',
    select: (data) => data.items,
  })
}

export function useBareMetalCatalogItems(options?: { includeUnpublished?: boolean }) {
  return useQuery({
    queryKey: [...bareMetalQueryKeys.catalogItems, options ?? {}],
    queryFn: () => listBareMetalCatalogItems(options ?? {}),
    staleTime: 60_000,
    select: (data) => data.items,
  })
}

export function useCreateBareMetalInstance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<FulfillmentBareMetalInstance>) =>
      createBareMetalInstance(payload),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: bareMetalQueryKeys.list })
    },
  })
}

export type { BareMetalInstanceCatalogItem, FulfillmentBareMetalInstance }
