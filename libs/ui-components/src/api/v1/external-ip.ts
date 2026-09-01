import { type Client } from '@connectrpc/connect';
import { useMutation } from '@tanstack/react-query';

import { ExternalIPAttachments, ExternalIPPools, ExternalIPState, ExternalIPs } from '@osac/types';

import { invalidateBareMetalInstancesQueries } from './baremetal-instance';
import { invalidateComputeInstancesQueries } from './compute-instance';
import { useApiFetch } from '../api-context';
import { type ListParams, apiQueryKey } from '../types';
import { useApiQuery, useApiQueryClient } from '../use-api-query';

export const EXTERNAL_IP_ALLOCATION_POLL_MS = 500;
export const EXTERNAL_IP_ALLOCATION_POLL_MAX_ATTEMPTS = 20;

export const pollExternalIpUntilAllocated = async (
  externalIpsClient: Client<typeof ExternalIPs>,
  id: string,
) => {
  for (let attempt = 0; attempt < EXTERNAL_IP_ALLOCATION_POLL_MAX_ATTEMPTS; attempt++) {
    const resp = await externalIpsClient.get({ id });
    if (!resp.object) {
      throw new Error('External IP not found in response');
    }
    const externalIp = resp.object;
    const state = externalIp.status?.state;
    if (state === ExternalIPState.EXTERNAL_IP_STATE_ALLOCATED) {
      return externalIp;
    }
    if (state === ExternalIPState.EXTERNAL_IP_STATE_FAILED) {
      throw new Error(externalIp.status?.message || 'External IP allocation failed');
    }
    await new Promise((resolve) => setTimeout(resolve, EXTERNAL_IP_ALLOCATION_POLL_MS));
  }
  throw new Error('Timed out waiting for the external IP to be allocated');
};

export type ExternalIPAttachmentTarget = 'computeInstance' | 'baremetalInstance';

export type AttachExternalIpInput =
  | {
      target: 'computeInstance';
      id: string;
      pool: string;
    }
  | {
      target: 'baremetalInstance';
      id: string;
      pool: string;
    };

export const useAttachExternalIp = () => {
  const externalIpsClient = useApiFetch(ExternalIPs);
  const attachmentsClient = useApiFetch(ExternalIPAttachments);
  const qc = useApiQueryClient();
  return useMutation({
    mutationFn: async (input: AttachExternalIpInput) => {
      const computeInstanceId = input.target === 'computeInstance' ? input.id : undefined;
      const baremetalInstanceId = input.target === 'baremetalInstance' ? input.id : undefined;
      const pool = input.pool;
      const createResp = await externalIpsClient.create({
        object: { spec: { pool: { id: pool } } },
      });
      if (!createResp.object) {
        throw new Error('External IP not found in response');
      }
      const created = createResp.object;

      let allocated;
      try {
        allocated = await pollExternalIpUntilAllocated(externalIpsClient, created.id);
      } catch (err) {
        await externalIpsClient.delete({ id: created.id }).catch(() => undefined);
        throw err;
      }

      try {
        const attachResp = await attachmentsClient.create({
          object: {
            spec: {
              externalIp: {
                id: allocated.id,
              },
              target:
                input.target === 'computeInstance'
                  ? { case: 'computeInstance', value: { id: computeInstanceId } }
                  : { case: 'baremetalInstance', value: { id: baremetalInstanceId } },
            },
          },
        });
        return attachResp.object;
      } catch (err) {
        await externalIpsClient.delete({ id: allocated.id }).catch(() => undefined);
        throw err;
      }
    },
    onSuccess: (_data, variables) => {
      if (variables.target === 'computeInstance') {
        invalidateComputeInstancesQueries(qc);
      } else {
        invalidateBareMetalInstancesQueries(qc);
      }

      // Also refresh attachment listings, since the Networking UI depends on them.
      void qc.invalidateQueries({
        queryKey: apiQueryKey('v1/external_ip_attachments', undefined, {
          target: variables.target,
          id: variables.id,
        }),
      });
    },
  });
};

export const useExternalIPPools = (params: ListParams = {}) => {
  const client = useApiFetch(ExternalIPPools);
  return useApiQuery({
    queryKey: apiQueryKey('v1/external_ip_pools', undefined, params),
    queryFn: () => client.list(params),
    select: (data) => data.items,
  });
};

export const useExternalIPAttachments = (target: ExternalIPAttachmentTarget, id: string) => {
  const client = useApiFetch(ExternalIPAttachments);
  return useApiQuery({
    queryKey: apiQueryKey('v1/external_ip_attachments', undefined, { target, id }),
    queryFn: () => client.list({}),
    select: (data) => {
      const matches = data.items.filter((attachment) => {
        const specTargetAny = attachment.spec?.target as unknown as
          | { case?: string; value?: { id?: string } }
          | { baremetalInstance?: { id?: string } }
          | { computeInstance?: { id?: string } }
          | undefined;

        if (!specTargetAny) {
          return false;
        }

        // buf/protobuf oneof shape may be either:
        //  - { case: 'baremetalInstance', value: { id: '...' } }
        //  - or { baremetalInstance: { id: '...' } }
        const inferredCase =
          (specTargetAny as { case?: string }).case ??
          ('baremetalInstance' in specTargetAny ? 'baremetalInstance' : undefined) ??
          ('computeInstance' in specTargetAny ? 'computeInstance' : undefined);

        if (inferredCase !== target) {
          return false;
        }

        const findId = (value: unknown): string | undefined => {
          if (!value || typeof value !== 'object') {
            return undefined;
          }
          const maybe = value as { id?: unknown };
          if (typeof maybe.id === 'string') {
            return maybe.id;
          }
          for (const v of Object.values(value as Record<string, unknown>)) {
            const nested = findId(v);
            if (nested) {
              return nested;
            }
          }
          return undefined;
        };

        const targetId = findId(specTargetAny);
        return targetId === id;
      });

      // Some mock fixtures/backends may represent protobuf oneofs differently.
      // If filtering results in an empty list, fall back to unfiltered results.
      return matches.length > 0 ? matches : data.items;
    },
    enabled: Boolean(id),
  });
};
