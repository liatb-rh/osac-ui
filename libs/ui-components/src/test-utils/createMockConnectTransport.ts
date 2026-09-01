import type { MessageInitShape } from '@bufbuild/protobuf';
import { Code, ConnectError, type Transport, createRouterTransport } from '@connectrpc/connect';

import type {
  BareMetalInstance,
  BareMetalInstanceCatalogItem,
  BareMetalInstanceStatus,
  Cluster,
  ClusterCatalogItem,
  ClusterTemplate,
  ClusterVersion,
  ClusterVersionsListRequest,
  ClustersCreateRequest,
  ClustersCreateResponse,
  ComputeInstanceCatalogItem,
  ConsoleSession,
  DiskImage,
  DiskImagesCreateRequest,
  DiskImagesCreateResponse,
  DiskImagesDeleteRequest,
  DiskImagesDeleteResponse,
  DiskImagesListRequest,
  DiskImagesUpdateRequest,
  DiskImagesUpdateResponse,
  ExternalIP,
  ExternalIPAttachment,
  ExternalIPAttachmentStatus,
  ExternalIPPool,
  ExternalIPStatus,
  HostType,
  IdentityProvider,
  IdentityProvidersCreateRequest,
  IdentityProvidersCreateResponse,
  IdentityProvidersUpdateRequest,
  IdentityProvidersUpdateResponse,
  InstanceType,
  NetworkClass,
  Organization,
  Project,
  ProjectMembership,
  StorageTier as PublicStorageTier,
  StorageTiersGetRequest as PublicStorageTiersGetRequest,
  StorageTiersListRequest as PublicStorageTiersListRequest,
  Role,
  RoleBinding,
  SecurityGroup,
  Subnet,
  User,
  VirtualNetwork,
} from '@osac/types';
import type { BareMetalInstanceTemplate } from '@osac/types';
import {
  BareMetalInstanceCatalogItems,
  BareMetalInstanceState,
  BareMetalInstances,
  ClusterCatalogItems,
  ClusterTemplates,
  ClusterVersionState,
  ClusterVersions,
  ClusterVersionsListResponseSchema,
  Clusters,
  ComputeInstanceCatalogItems,
  ConsoleSessions,
  DiskImageLifecycle,
  DiskImages,
  DiskImagesListResponseSchema,
  ExternalIPAttachmentState,
  ExternalIPAttachments,
  ExternalIPPools,
  ExternalIPState,
  ExternalIPs,
  HostTypes,
  IdentityProviders,
  InstanceTypeState,
  InstanceTypes,
  NetworkClasses,
  Organizations,
  ProjectMemberships,
  Projects,
  StorageTiers as PublicStorageTiers,
  StorageTiersGetResponseSchema as PublicStorageTiersGetResponseSchema,
  StorageTiersListResponseSchema as PublicStorageTiersListResponseSchema,
  RoleBindings,
  Roles,
  SecurityGroups,
  Subnets,
  Users,
  VirtualNetworkState,
  VirtualNetworks,
} from '@osac/types';
import { BareMetalInstanceTemplates } from '@osac/types';
import type {
  BareMetalInstanceTypesDeleteRequest,
  BareMetalInstanceTypesListRequest,
  InstanceTypesCreateRequest,
  InstanceTypesCreateResponse,
  InstanceTypesDeleteRequest,
  InstanceTypesDeleteResponse,
  InstanceTypesListRequest,
  InstanceTypesListResponse,
  InstanceTypesUpdateRequest,
  InstanceTypesUpdateResponse,
  BareMetalInstanceType as PrivateBareMetalInstanceType,
  InstanceType as PrivateInstanceType,
  Tenant as PrivateTenant,
  StorageBackend,
  StorageBackendsCreateRequest,
  StorageBackendsCreateResponse,
  StorageBackendsListRequest,
  StorageBackendsUpdateRequest,
  StorageBackendsUpdateResponse,
  StorageTier,
  StorageTiersCreateRequest,
  StorageTiersCreateResponse,
  StorageTiersDeleteRequest,
  StorageTiersGetRequest,
  StorageTiersListRequest,
  StorageTiersUpdateRequest,
  StorageTiersUpdateResponse,
  TenantsCreateRequest,
  TenantsCreateResponse,
} from '@osac/types/private';
import {
  BareMetalInstanceTypesDeleteResponseSchema,
  BareMetalInstanceTypesListResponseSchema,
  BareMetalInstanceTypes as PrivateBareMetalInstanceTypes,
  InstanceTypes as PrivateInstanceTypes,
  Tenants as PrivateTenants,
  StorageBackendState,
  StorageBackends,
  StorageBackendsListResponseSchema,
  StorageTierState,
  StorageTiers,
  StorageTiersDeleteResponseSchema,
  StorageTiersGetResponseSchema,
  StorageTiersListResponseSchema,
} from '@osac/types/private';

import { UnauthorizedError } from '../utils/unauthorizedError';

export type MockApiFixtures = {
  catalogItems?: ComputeInstanceCatalogItem[];
  bareMetalInstances?: BareMetalInstance[];
  bareMetalInstanceCatalogItems?: BareMetalInstanceCatalogItem[];
  bareMetalInstanceTemplates?: BareMetalInstanceTemplate[];
  clusters?: Cluster[];
  clusterCatalogItems?: ClusterCatalogItem[];
  clusterTemplates?: ClusterTemplate[];
  clusterVersions?: ClusterVersion[];
  hostTypes?: HostType[];
  tenants?: PrivateTenant[];
  virtualNetworks?: VirtualNetwork[];
  subnets?: Subnet[];
  securityGroups?: SecurityGroup[];
  networkClasses?: NetworkClass[];
  organizations?: Organization[];
  identityProviders?: IdentityProvider[];
  instanceTypes?: InstanceType[];
  diskImages?: DiskImage[];
  projects?: Project[];
  projectMemberships?: ProjectMembership[];
  privateInstanceTypes?: PrivateInstanceType[];
  privateBaremetalInstanceTypes?: PrivateBareMetalInstanceType[];
  storageBackends?: StorageBackend[];
  storageTiers?: StorageTier[];
  publicStorageTiers?: PublicStorageTier[];
  roles?: Role[];
  roleBindings?: RoleBinding[];
  users?: User[];
  externalIpPools?: ExternalIPPool[];
  externalIps?: ExternalIP[];
  externalIpAttachments?: ExternalIPAttachment[];
};

export const wrapWithAuthInterceptor = (transport: Transport): Transport => {
  const wrapped: Transport = {
    ...transport,
    unary: async (...args) => {
      try {
        return await transport.unary(...args);
      } catch (err) {
        if (err instanceof ConnectError && err.code === Code.Unauthenticated) {
          throw new UnauthorizedError();
        }
        throw err;
      }
    },
  };
  return wrapped;
};

const matchesReadyStateFilter = (
  filter: string | undefined,
  state: number | undefined,
): boolean => {
  if (!filter?.includes('this.status.state ==')) {
    return true;
  }
  return state === VirtualNetworkState.READY;
};

const matchesVirtualNetworkScopeFilter = (
  filter: string | undefined,
  virtualNetwork: string | undefined,
): boolean => {
  if (!filter) {
    return true;
  }
  const match = filter.match(/this\.spec\.virtual_network\.id == "([^"]+)"/);
  if (!match) {
    return true;
  }
  if (!virtualNetwork) {
    return false;
  }
  return virtualNetwork === match[1];
};

const matchesInstanceTypeActiveFilter = (
  filter: string | undefined,
  state: number | undefined,
): boolean => {
  if (!filter?.includes('this.spec.state ==')) {
    return true;
  }
  return state === InstanceTypeState.ACTIVE;
};

const matchesDiskImageLifecycleFilter = (
  filter: string | undefined,
  lifecycle: number | undefined,
): boolean => {
  if (!filter?.includes('this.spec.lifecycle')) {
    return true;
  }
  if (filter.includes(`!= ${DiskImageLifecycle.OBSOLETE}`)) {
    return lifecycle !== DiskImageLifecycle.OBSOLETE;
  }
  return true;
};

const matchesClusterVersionActiveFilter = (
  filter: string | undefined,
  state: number | undefined,
  enabled: boolean | undefined,
): boolean => {
  if (!filter) {
    return true;
  }
  if (!filter.includes('this.spec.state')) {
    return true;
  }
  // The all-states filter enumerates every state, including OBSOLETE — no filtering
  // applied (mirrors the backend: referencing every state defeats the default hiding).
  if (filter.includes(`== ${ClusterVersionState.OBSOLETE}`) || filter.includes(' in [')) {
    return true;
  }
  const stateAllowed =
    state === ClusterVersionState.ACTIVE || state === ClusterVersionState.DEPRECATED;
  if (filter.includes('this.spec.enabled')) {
    return stateAllowed && enabled === true;
  }
  return stateAllowed;
};

const matchesStorageBackendReadyFilter = (
  filter: string | undefined,
  state: number | undefined,
): boolean => {
  if (!filter?.includes('this.status.state ==')) {
    return true;
  }
  return state === StorageBackendState.READY;
};

const matchesStorageTierActiveFilter = (
  filter: string | undefined,
  state: number | undefined,
): boolean => {
  if (!filter?.includes('this.status.state ==')) {
    return true;
  }
  return state === StorageTierState.ACTIVE;
};

export type MockTransportOverrides = {
  onClusterCreate?: (req: ClustersCreateRequest) => ClustersCreateResponse;
  onClusterVersionList?: (
    req: ClusterVersionsListRequest,
  ) => MessageInitShape<typeof ClusterVersionsListResponseSchema>;
  onIdentityProviderCreate?: (
    req: IdentityProvidersCreateRequest,
  ) => IdentityProvidersCreateResponse;
  onIdentityProviderUpdate?: (
    req: IdentityProvidersUpdateRequest,
  ) => IdentityProvidersUpdateResponse;
  onTenantCreate?: (req: TenantsCreateRequest) => TenantsCreateResponse;
  onStorageBackendList?: (
    req: StorageBackendsListRequest,
  ) => MessageInitShape<typeof StorageBackendsListResponseSchema>;
  onStorageBackendCreate?: (
    req: StorageBackendsCreateRequest,
  ) => StorageBackendsCreateResponse | Promise<StorageBackendsCreateResponse>;
  onStorageBackendUpdate?: (req: StorageBackendsUpdateRequest) => StorageBackendsUpdateResponse;
  onStorageTierList?: (
    req: StorageTiersListRequest,
  ) => MessageInitShape<typeof StorageTiersListResponseSchema>;
  onPublicStorageTierList?: (
    req: PublicStorageTiersListRequest,
  ) => MessageInitShape<typeof PublicStorageTiersListResponseSchema>;
  onPublicStorageTierGet?: (
    req: PublicStorageTiersGetRequest,
  ) =>
    | MessageInitShape<typeof PublicStorageTiersGetResponseSchema>
    | Promise<MessageInitShape<typeof PublicStorageTiersGetResponseSchema>>;
  onStorageTierGet?: (
    req: StorageTiersGetRequest,
  ) =>
    | MessageInitShape<typeof StorageTiersGetResponseSchema>
    | Promise<MessageInitShape<typeof StorageTiersGetResponseSchema>>;
  onStorageTierCreate?: (
    req: StorageTiersCreateRequest,
  ) => StorageTiersCreateResponse | Promise<StorageTiersCreateResponse>;
  onStorageTierUpdate?: (req: StorageTiersUpdateRequest) => StorageTiersUpdateResponse;
  onStorageTierDelete?: (
    req: StorageTiersDeleteRequest,
  ) => MessageInitShape<typeof StorageTiersDeleteResponseSchema>;
  onInstanceTypeList?: (req: InstanceTypesListRequest) => InstanceTypesListResponse;
  onInstanceTypeCreate?: (req: InstanceTypesCreateRequest) => InstanceTypesCreateResponse;
  onInstanceTypeUpdate?: (req: InstanceTypesUpdateRequest) => InstanceTypesUpdateResponse;
  onInstanceTypeDelete?: (req: InstanceTypesDeleteRequest) => InstanceTypesDeleteResponse;
  onBaremetalInstanceTypeList?: (
    req: BareMetalInstanceTypesListRequest,
  ) => MessageInitShape<typeof BareMetalInstanceTypesListResponseSchema>;
  onBaremetalInstanceTypeDelete?: (
    req: BareMetalInstanceTypesDeleteRequest,
  ) => MessageInitShape<typeof BareMetalInstanceTypesDeleteResponseSchema>;
  onDiskImageList?: (
    req: DiskImagesListRequest,
  ) => MessageInitShape<typeof DiskImagesListResponseSchema>;
  onDiskImageCreate?: (req: DiskImagesCreateRequest) => DiskImagesCreateResponse;
  onDiskImageUpdate?: (req: DiskImagesUpdateRequest) => DiskImagesUpdateResponse;
  onDiskImageDelete?: (req: DiskImagesDeleteRequest) => DiskImagesDeleteResponse;
};

export const createMockConnectTransport = (
  fixtures: MockApiFixtures = {},
  overrides: MockTransportOverrides = {},
) => {
  const catalogItems = fixtures.catalogItems ?? [];
  const bareMetalInstances = [...(fixtures.bareMetalInstances ?? [])];
  const bareMetalInstanceCatalogItems = fixtures.bareMetalInstanceCatalogItems ?? [];
  const bareMetalInstanceTemplates = fixtures.bareMetalInstanceTemplates ?? [];
  const clusters = fixtures.clusters ?? [];
  const clusterCatalogItems = fixtures.clusterCatalogItems ?? [];
  const clusterTemplates = fixtures.clusterTemplates ?? [];
  const clusterVersions = fixtures.clusterVersions ?? [];
  const hostTypes = fixtures.hostTypes ?? [];
  const tenants = fixtures.tenants ?? [];
  const identityProviders = fixtures.identityProviders ?? [];
  const projects = fixtures.projects ?? [];
  const projectMemberships = fixtures.projectMemberships ?? [];
  const virtualNetworks = fixtures.virtualNetworks ?? [];
  const subnets = fixtures.subnets ?? [];
  const securityGroups = fixtures.securityGroups ?? [];
  const networkClasses = fixtures.networkClasses ?? [];
  const organizations = fixtures.organizations ?? [];
  const instanceTypes = fixtures.instanceTypes ?? [];
  const diskImages = fixtures.diskImages ?? [];
  const privateInstanceTypes = fixtures.privateInstanceTypes ?? [];
  const privateBaremetalInstanceTypes = fixtures.privateBaremetalInstanceTypes ?? [];
  const storageBackends = [...(fixtures.storageBackends ?? [])];
  const storageTiers = fixtures.storageTiers ?? [];
  const publicStorageTiers = fixtures.publicStorageTiers ?? [];
  const roles = fixtures.roles ?? [];
  const roleBindingsFixtures = fixtures.roleBindings ?? [];
  const usersFixtures = fixtures.users ?? [];
  const externalIpPools = fixtures.externalIpPools ?? [];
  const externalIps = [...(fixtures.externalIps ?? [])];
  const externalIpAttachments = [...(fixtures.externalIpAttachments ?? [])];
  let mockIdCounter = 0;
  const nextMockId = (prefix: string): string => `${prefix}-${(mockIdCounter += 1)}`;

  return wrapWithAuthInterceptor(
    createRouterTransport((router) => {
      router.service(ComputeInstanceCatalogItems, {
        list: () => ({ items: catalogItems }),
        get: (req) => ({
          object: catalogItems.find((i) => i.id === req.id),
        }),
      });

      router.service(ClusterCatalogItems, {
        list: () => ({ items: clusterCatalogItems }),
        get: (req) => ({
          object: clusterCatalogItems.find((i) => i.id === req.id),
        }),
      });

      router.service(ClusterTemplates, {
        get: (req) => {
          const template = clusterTemplates.find((i) => i.id === req.id);
          if (!template) {
            throw new ConnectError(`Cluster template not found in test: ${req.id}`, Code.NotFound);
          }
          return {
            object: template,
          };
        },
      });

      router.service(ClusterVersions, {
        list: (req) => {
          if (overrides.onClusterVersionList) {
            return overrides.onClusterVersionList(req);
          }
          return {
            items: clusterVersions.filter((item) =>
              matchesClusterVersionActiveFilter(req.filter, item.spec?.state, item.spec?.enabled),
            ),
          };
        },
        get: (req) => ({
          object: clusterVersions.find((i) => i.id === req.id),
        }),
      });

      router.service(HostTypes, {
        list: () => ({
          items: hostTypes,
          size: hostTypes.length,
          total: hostTypes.length,
        }),
        get: (req) => {
          const hostType = hostTypes.find((i) => i.id === req.id);
          if (!hostType) {
            throw new ConnectError(`Host type not found in test: ${req.id}`, Code.NotFound);
          }
          return {
            object: hostType,
          };
        },
      });

      router.service(VirtualNetworks, {
        list: (req) => ({
          items: virtualNetworks.filter(
            (item) =>
              matchesReadyStateFilter(req.filter, item.status?.state) &&
              matchesVirtualNetworkScopeFilter(req.filter, undefined),
          ),
        }),
        get: (req) => ({
          object: virtualNetworks.find((i) => i.id === req.id),
        }),
      });

      router.service(Subnets, {
        list: (req) => ({
          items: subnets.filter(
            (item) =>
              matchesReadyStateFilter(req.filter, item.status?.state) &&
              matchesVirtualNetworkScopeFilter(req.filter, item.spec?.virtualNetwork?.id),
          ),
        }),
        get: (req) => ({
          object: subnets.find((i) => i.id === req.id),
        }),
      });

      router.service(SecurityGroups, {
        list: (req) => ({
          items: securityGroups.filter(
            (item) =>
              matchesReadyStateFilter(req.filter, item.status?.state) &&
              matchesVirtualNetworkScopeFilter(req.filter, item.spec?.virtualNetwork?.id),
          ),
        }),
      });

      router.service(InstanceTypes, {
        list: (req) => ({
          items: instanceTypes.filter((item) =>
            matchesInstanceTypeActiveFilter(req.filter, item.spec?.state),
          ),
        }),
        get: (req) => ({
          object: instanceTypes.find((i) => i.id === req.id),
        }),
      });

      router.service(DiskImages, {
        list: (req) => {
          if (overrides.onDiskImageList) {
            return overrides.onDiskImageList(req);
          }
          const items = diskImages.filter((item) =>
            matchesDiskImageLifecycleFilter(req.filter, item.spec?.lifecycle),
          );
          return { items, size: items.length, total: items.length };
        },
        get: (req) => ({
          object: diskImages.find((i) => i.id === req.id),
        }),
        create: (req) => {
          if (overrides.onDiskImageCreate) {
            return overrides.onDiskImageCreate(req);
          }
          return { object: { id: 'new-disk-image-1', ...req.object } };
        },
        update: (req) => {
          if (overrides.onDiskImageUpdate) {
            return overrides.onDiskImageUpdate(req);
          }
          return { object: req.object };
        },
        delete: (req) => {
          if (overrides.onDiskImageDelete) {
            return overrides.onDiskImageDelete(req);
          }
          return {};
        },
      });

      router.service(IdentityProviders, {
        list: () => ({
          items: identityProviders,
          size: identityProviders.length,
          total: identityProviders.length,
        }),
        get: (req) => ({
          object: identityProviders.find((idp) => idp.id === req.id),
        }),
        create: (req) => {
          if (overrides.onIdentityProviderCreate) {
            return overrides.onIdentityProviderCreate(req);
          }
          return {
            object: { id: 'new-idp-1', ...req.object },
          };
        },
        update: (req) => {
          if (overrides.onIdentityProviderUpdate) {
            return overrides.onIdentityProviderUpdate(req);
          }
          return {
            object: req.object,
          };
        },
        delete: () => ({}),
      });

      router.service(StorageBackends, {
        list: (req) => {
          if (overrides.onStorageBackendList) {
            return overrides.onStorageBackendList(req);
          }
          const items = storageBackends.filter((item) =>
            matchesStorageBackendReadyFilter(req.filter, item.status?.state),
          );
          return { items, size: items.length, total: items.length };
        },
        get: (req) => ({
          object: storageBackends.find((b) => b.id === req.id),
        }),
        create: (req) => {
          if (overrides.onStorageBackendCreate) {
            return overrides.onStorageBackendCreate(req);
          }
          return {
            object: {
              id: 'new-storage-backend-1',
              metadata: req.object?.metadata,
              spec: req.object?.spec,
              status: { state: StorageBackendState.READY },
            },
          };
        },
        update: (req) => {
          if (overrides.onStorageBackendUpdate) {
            return overrides.onStorageBackendUpdate(req);
          }
          return { object: req.object };
        },
        delete: (req) => {
          const index = storageBackends.findIndex((b) => b.id === req.id);
          if (index !== -1) {
            storageBackends.splice(index, 1);
          }
          return {};
        },
      });

      router.service(StorageTiers, {
        list: (req) => {
          if (overrides.onStorageTierList) {
            return overrides.onStorageTierList(req);
          }
          const items = storageTiers.filter((item) =>
            matchesStorageTierActiveFilter(req.filter, item.status?.state),
          );
          return {
            items,
            size: items.length,
            total: items.length,
          };
        },
        get: (req) => {
          if (overrides.onStorageTierGet) {
            return overrides.onStorageTierGet(req);
          }
          return { object: storageTiers.find((t) => t.id === req.id) };
        },
        create: (req) => {
          if (overrides.onStorageTierCreate) {
            return overrides.onStorageTierCreate(req);
          }
          return {
            object: {
              id: 'new-storage-tier-1',
              metadata: req.object?.metadata,
              spec: req.object?.spec,
              status: { state: StorageTierState.ACTIVE },
            },
          };
        },
        update: (req) => {
          if (overrides.onStorageTierUpdate) {
            return overrides.onStorageTierUpdate(req);
          }
          return { object: req.object };
        },
        delete: (req) => {
          if (overrides.onStorageTierDelete) {
            return overrides.onStorageTierDelete(req);
          }
          return {};
        },
      });

      router.service(PublicStorageTiers, {
        list: (req) => {
          if (overrides.onPublicStorageTierList) {
            return overrides.onPublicStorageTierList(req);
          }
          const items = publicStorageTiers.filter((item) =>
            matchesStorageTierActiveFilter(req.filter, item.status?.state),
          );
          return {
            items,
            size: items.length,
            total: items.length,
          };
        },
        get: (req) => {
          if (overrides.onPublicStorageTierGet) {
            return overrides.onPublicStorageTierGet(req);
          }
          return { object: publicStorageTiers.find((t) => t.id === req.id) };
        },
      });

      router.service(PrivateInstanceTypes, {
        list: (req) => {
          if (overrides.onInstanceTypeList) {
            return overrides.onInstanceTypeList(req);
          }
          return {
            items: privateInstanceTypes,
            size: privateInstanceTypes.length,
            total: privateInstanceTypes.length,
          };
        },
        get: (req) => ({
          object: privateInstanceTypes.find((item) => item.id === req.id),
        }),
        create: (req) => {
          if (overrides.onInstanceTypeCreate) {
            return overrides.onInstanceTypeCreate(req);
          }
          return { object: { id: 'new-instance-type-1', ...req.object } };
        },
        update: (req) => {
          if (overrides.onInstanceTypeUpdate) {
            return overrides.onInstanceTypeUpdate(req);
          }
          return { object: req.object };
        },
        delete: (req) => {
          if (overrides.onInstanceTypeDelete) {
            return overrides.onInstanceTypeDelete(req);
          }
          return {};
        },
      });

      router.service(PrivateBareMetalInstanceTypes, {
        list: (req) => {
          if (overrides.onBaremetalInstanceTypeList) {
            return overrides.onBaremetalInstanceTypeList(req);
          }
          return {
            items: privateBaremetalInstanceTypes,
            size: privateBaremetalInstanceTypes.length,
            total: privateBaremetalInstanceTypes.length,
          };
        },
        get: (req) => ({
          object: privateBaremetalInstanceTypes.find((item) => item.id === req.id),
        }),
        delete: (req) => {
          if (overrides.onBaremetalInstanceTypeDelete) {
            return overrides.onBaremetalInstanceTypeDelete(req);
          }
          return {};
        },
      });

      router.service(PrivateTenants, {
        list: () => ({
          items: tenants,
          size: tenants.length,
          total: tenants.length,
        }),
        get: (req) => ({
          object: tenants.find((t) => t.id === req.id),
        }),
        create: (req) => {
          if (overrides.onTenantCreate) {
            return overrides.onTenantCreate(req);
          }
          return {
            object: {
              id: 'new-tenant-1',
              metadata: req.object?.metadata,
              spec: req.object?.spec,
              status: {
                breakGlassCredentials: {
                  username: 'break-glass-admin',
                  password: 'temp-password-123',
                },
              },
            },
          };
        },
        delete: () => ({}),
      });

      router.service(Clusters, {
        list: () => ({ items: clusters, size: clusters.length, total: clusters.length }),
        get: (req) => ({
          object: clusters.find((c) => c.id === req.id),
        }),
        create: (req) => {
          if (overrides.onClusterCreate) {
            return overrides.onClusterCreate(req);
          }
          return { object: { id: 'cluster-1', ...req.object } };
        },
      });

      router.service(Projects, {
        list: () => ({
          items: projects,
          size: projects.length,
          total: projects.length,
        }),
        get: (req) => ({
          object: projects.find((p) => p.id === req.id),
        }),
        create: (req) => ({
          object: { ...req.object, id: 'new-project-1' },
        }),
        delete: () => ({}),
      });

      router.service(ProjectMemberships, {
        list: () => ({
          items: projectMemberships,
          size: projectMemberships.length,
          total: projectMemberships.length,
        }),
        get: (req) => ({
          object: projectMemberships.find((pm) => pm.id === req.id),
        }),
        create: (req) => ({
          object: { ...req.object, id: 'new-pm-1' },
        }),
        delete: () => ({}),
      });

      router.service(Roles, {
        list: () => ({
          items: roles,
          size: roles.length,
          total: roles.length,
        }),
        get: (req) => ({
          object: roles.find((r) => r.id === req.id),
        }),
      });

      router.service(RoleBindings, {
        list: () => ({
          items: roleBindingsFixtures,
          size: roleBindingsFixtures.length,
          total: roleBindingsFixtures.length,
        }),
        get: (req) => ({
          object: roleBindingsFixtures.find((rb) => rb.id === req.id),
        }),
        create: (req) => ({
          object: { id: 'new-rb-1', ...req.object },
        }),
        delete: () => ({}),
      });

      router.service(Users, {
        list: () => ({
          items: usersFixtures,
          size: usersFixtures.length,
          total: usersFixtures.length,
        }),
        get: (req) => ({
          object: usersFixtures.find((u) => u.id === req.id),
        }),
      });

      // ── BMaaS ─────────────────────────────────────────────────────────────

      router.service(BareMetalInstanceTemplates, {
        list: () => ({
          items: bareMetalInstanceTemplates,
          size: bareMetalInstanceTemplates.length,
          total: bareMetalInstanceTemplates.length,
        }),
        get: (req) => {
          const tpl = bareMetalInstanceTemplates.find((t) => t.id === req.id);
          if (!tpl) {
            throw new ConnectError(`BareMetalInstanceTemplate not found: ${req.id}`, Code.NotFound);
          }
          return { object: tpl };
        },
      });

      router.service(BareMetalInstanceCatalogItems, {
        list: () => ({ items: bareMetalInstanceCatalogItems }),
        get: (req) => ({
          object: bareMetalInstanceCatalogItems.find((i) => i.id === req.id),
        }),
      });

      router.service(BareMetalInstances, {
        list: () => ({ items: bareMetalInstances }),
        get: (req) => ({ object: bareMetalInstances.find((b) => b.id === req.id) }),
        create: (req) => {
          const created: BareMetalInstance = {
            ...(req.object as BareMetalInstance),
            id: nextMockId('bmi'),
            status: {
              $typeName: 'osac.public.v1.BareMetalInstanceStatus',
              state: BareMetalInstanceState.PROVISIONING,
              restartTrigger: 0n,
              conditions: [],
              networkAttachmentStatuses: [],
            } as BareMetalInstanceStatus,
          };
          bareMetalInstances.push(created);
          return { object: created };
        },
        update: (req) => {
          const idx = bareMetalInstances.findIndex((b) => b.id === req.object?.id);
          if (idx === -1) {
            throw new ConnectError(`BareMetalInstance not found: ${req.object?.id}`, Code.NotFound);
          }
          const updated = { ...bareMetalInstances[idx], spec: req.object?.spec };
          bareMetalInstances[idx] = updated as BareMetalInstance;
          return { object: updated };
        },
        delete: (req) => {
          const idx = bareMetalInstances.findIndex((b) => b.id === req.id);
          if (idx !== -1) {
            bareMetalInstances.splice(idx, 1);
          }
          return {};
        },
      });

      // ── Networking extras ─────────────────────────────────────────────────

      router.service(NetworkClasses, {
        list: () => ({ items: networkClasses }),
        get: (req) => ({ object: networkClasses.find((nc) => nc.id === req.id) }),
      });

      router.service(Organizations, {
        list: () => ({ items: organizations }),
        get: (req) => ({ object: organizations.find((o) => o.id === req.id) }),
      });

      router.service(ExternalIPPools, {
        list: () => ({ items: externalIpPools }),
        get: (req) => ({ object: externalIpPools.find((p) => p.id === req.id) }),
      });

      router.service(ExternalIPs, {
        list: () => ({ items: externalIps }),
        get: (req) => ({ object: externalIps.find((e) => e.id === req.id) }),
        create: (req) => {
          const created: ExternalIP = {
            ...(req.object as ExternalIP),
            id: nextMockId('eip'),
            status: {
              $typeName: 'osac.public.v1.ExternalIPStatus',
              state: ExternalIPState.EXTERNAL_IP_STATE_ALLOCATED,
              address: `203.0.113.${10 + externalIps.length}`,
              pool: req.object?.spec?.pool?.id ?? '',
              attached: false,
            } as ExternalIPStatus,
          };
          externalIps.push(created);
          return { object: created };
        },
        delete: (req) => {
          const idx = externalIps.findIndex((e) => e.id === req.id);
          if (idx !== -1) {
            externalIps.splice(idx, 1);
          }
          return {};
        },
      });

      router.service(ExternalIPAttachments, {
        list: () => ({
          items: externalIpAttachments,
          size: externalIpAttachments.length,
          total: externalIpAttachments.length,
        }),
        create: (req) => {
          const created: ExternalIPAttachment = {
            ...(req.object as ExternalIPAttachment),
            id: nextMockId('eipa'),
            status: {
              $typeName: 'osac.public.v1.ExternalIPAttachmentStatus',
              state: ExternalIPAttachmentState.EXTERNAL_IP_ATTACHMENT_STATE_READY,
              externalIpAddress:
                externalIps.find((e) => e.id === req.object?.spec?.externalIp?.id)?.status
                  ?.address ?? '',
            } as ExternalIPAttachmentStatus,
          };
          externalIpAttachments.push(created);
          return { object: created };
        },
        delete: (req) => {
          const idx = externalIpAttachments.findIndex((a) => a.id === req.id);
          if (idx !== -1) {
            externalIpAttachments.splice(idx, 1);
          }
          return {};
        },
      });

      // ── Console (stub) ────────────────────────────────────────────────────

      router.service(ConsoleSessions, {
        create: (req) => ({
          object: {
            ...(req.object as ConsoleSession),
            ticket: nextMockId('console-ticket'),
          },
        }),
      });
    }),
  );
};
