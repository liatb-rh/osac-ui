import { useMutation, useQueryClient } from '@tanstack/react-query'
import { upgradeCluster } from './clusterClient'

export function useUpgradeCluster() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, targetVersion }: { id: string; targetVersion: string }) =>
      upgradeCluster(id, targetVersion),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ['clusters'] })
    },
  })
}
