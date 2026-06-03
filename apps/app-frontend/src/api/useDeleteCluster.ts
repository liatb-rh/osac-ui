import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteCluster } from './clusterClient'

export function useDeleteCluster() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCluster(id),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ['clusters'] })
    },
  })
}
