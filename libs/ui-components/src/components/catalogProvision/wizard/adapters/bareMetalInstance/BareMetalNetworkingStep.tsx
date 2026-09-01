import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Checkbox, Stack, StackItem } from '@patternfly/react-core';
import { useFormikContext } from 'formik';

import type {
  BareMetalInstanceCatalogItem,
  HostType,
  NetworkInterface,
  VirtualNetwork,
} from '@osac/types';

import type { BareMetalInstanceWizardValues } from './fields';
import { useBareMetalInstanceTemplate } from '../../../../../api/v1/baremetal-instance';
import { useHostType, useHostTypes } from '../../../../../api/v1/host-types';
import {
  VIRTUAL_NETWORK_READY_LIST_FILTER,
  resourceDisplayName,
  securityGroupFilterForVirtualNetworkList,
  useSecurityGroups,
  useSubnets,
  useVirtualNetworks,
  virtualNetworkFilterForSubnetList,
} from '../../../../../api/v1/networking';
import { useTranslation } from '../../../../../hooks/useTranslation';
import { MultiSelectField } from '../../../../Form/MultiSelectField';
import OsacForm from '../../../../Form/OsacForm';
import { SelectField } from '../../../../Form/SelectField';

interface Props {
  catalogItem: BareMetalInstanceCatalogItem | null;
}

const nonLifecycleInterfaces = (hostType?: HostType): NetworkInterface[] =>
  hostType?.interfaces?.filter((i) => i.role !== 'lifecycle') ?? [];

const defaultFabricInterfaceName = (hostType?: HostType): string =>
  hostType?.interfaces?.find((i) => i.role === 'fabric')?.name ??
  nonLifecycleInterfaces(hostType)[0]?.name ??
  '';

export const BareMetalNetworkingStep = ({ catalogItem }: Props) => {
  const { t } = useTranslation();
  const { values, setFieldValue } = useFormikContext<BareMetalInstanceWizardValues>();

  const templateId = catalogItem?.template?.id;
  const {
    data: template,
    isPending: templateLoading,
    isError: templateError,
    refetch,
  } = useBareMetalInstanceTemplate(templateId);

  const hostTypeId = template?.hostType;
  const {
    data: hostType,
    isPending: hostTypeLoading,
    isError: hostTypeError,
    refetch: refetchHostType,
  } = useHostTypes({ filter: `this.metadata.name == "${hostTypeId}"` })

  const interfaces = useMemo(() => nonLifecycleInterfaces(hostType?.[0] ?? undefined), [hostType?.[0]]);
  const hostTypeDefaultInterfaceName = useMemo(() => defaultFabricInterfaceName(hostType?.[0]), [hostType?.[0] ?? undefined]);

  const attachmentValues = values.spec.networking.attachments ?? [];

  const [prevHostTypeId, setPrevHostTypeId] = useState<string | undefined>(hostTypeId);
  useEffect(() => {
    if (prevHostTypeId && prevHostTypeId !== hostTypeId && hostTypeDefaultInterfaceName) {
      void setFieldValue(
        'spec.networking.attachments',
        attachmentValues.map((att) => ({
          ...att,
          interface: hostTypeDefaultInterfaceName,
        })),
      );
    }
    if (hostTypeId) {
      setPrevHostTypeId(hostTypeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostTypeId, hostTypeDefaultInterfaceName, hostTypeLoading]);

  const {
    data: virtualNetworks = [],
    isPending: virtualNetworksLoading,
    isError: virtualNetworksError,
    refetch: refetchVirtualNetworks,
  } = useVirtualNetworks({ filter: VIRTUAL_NETWORK_READY_LIST_FILTER });

  const listError = templateError || hostTypeError || virtualNetworksError;
  const loadingPlaceholder = t('catalogProvision.common.loading');

  if (!catalogItem) {
    return null;
  }

  return (
    <Stack hasGutter>
      {listError ? (
        <StackItem>
          <Alert variant="danger" isInline title={t('catalogProvision.networking.loadError')}>
            <Button
              variant="link"
              isInline
              onClick={() => {
                void refetch();
                void refetchHostType();
                void refetchVirtualNetworks();
              }}
            >
              {t('catalogProvision.actions.retry')}
            </Button>
          </Alert>
        </StackItem>
      ) : null}

      <StackItem>
        <OsacForm>
          {attachmentValues.map((attachment, index) => {
            const isInterfaceLoading = templateLoading || hostTypeLoading;

            return (
              <BareMetalNetworkingAttachmentRow
                key={`bm-net-att-${index}`}
                index={index}
                attachment={attachment}
                attachmentValues={attachmentValues}
                isInterfaceLoading={isInterfaceLoading}
                interfaces={interfaces}
                virtualNetworks={virtualNetworks}
                virtualNetworksLoading={virtualNetworksLoading}
                loadingPlaceholder={loadingPlaceholder}
                onSetFieldValue={setFieldValue}
                canRemove={attachmentValues.length > 1}
                onRemove={() => {
                  const remaining = attachmentValues.filter((_, i) => i !== index);
                  if (remaining.length === 0) {
                    return;
                  }
                  const hasPrimary = remaining.some((a) => Boolean(a.primary));
                  if (!hasPrimary) {
                    remaining[0] = { ...remaining[0], primary: true };
                  }
                  void setFieldValue('spec.networking.attachments', remaining);
                }}
              />
            );
          })}

          <StackItem>
            <Button
              variant="secondary"
              isDisabled={!hostType || attachmentValues.length >= interfaces.length}
              onClick={() => {
                const max = interfaces.length;
                if (!max) {
                  return;
                }
                if (attachmentValues.length >= max) {
                  return;
                }

                const nextAttachment = {
                  interface: hostTypeDefaultInterfaceName,
                  virtualNetwork: '',
                  subnet: '',
                  securityGroups: [],
                  primary: false,
                };
                void setFieldValue('spec.networking.attachments', [
                  ...attachmentValues,
                  nextAttachment,
                ]);
              }}
            >
              {t('catalogProvision.bareMetal.actions.addNetworkInterface')}
            </Button>
          </StackItem>

          {attachmentValues.length > 1 ? (
            <StackItem>
              <Alert variant="info" isInline title={t('catalogProvision.bareMetal.hint.primary')}>
                {t('catalogProvision.bareMetal.hint.primarySelection')}
              </Alert>
            </StackItem>
          ) : null}

          <Checkbox
            isChecked={values.spec.networking.autoExternalIpAttachment}
            onChange={(checked) =>
              void setFieldValue('spec.networking.autoExternalIpAttachment', checked)
            }
            label={t('catalogProvision.bareMetal.fields.autoExternalIpAttachment')}
            id="bm-auto-external-ip"
          />
        </OsacForm>
      </StackItem>
    </Stack>
  );
};

interface AttachmentRowProps {
  index: number;
  attachment: BareMetalInstanceWizardValues['spec']['networking']['attachments'][number];
  attachmentValues: BareMetalInstanceWizardValues['spec']['networking']['attachments'];
  isInterfaceLoading: boolean;
  interfaces: NetworkInterface[];
  virtualNetworks: VirtualNetwork[];
  virtualNetworksLoading: boolean;
  loadingPlaceholder: string;
  onSetFieldValue: (field: string, value: unknown) => void;
  canRemove: boolean;
  onRemove: () => void;
}

const BareMetalNetworkingAttachmentRow = ({
  index,
  attachment,
  attachmentValues,
  isInterfaceLoading,
  interfaces,
  virtualNetworks,
  virtualNetworksLoading,
  loadingPlaceholder,
  onSetFieldValue,
  canRemove,
  onRemove,
}: AttachmentRowProps) => {
  const { t } = useTranslation();
  const attachmentPath = `spec.networking.attachments.${index}`;
  const virtualNetworkId = attachment.virtualNetwork;

  const subnetFilter = virtualNetworkId
    ? virtualNetworkFilterForSubnetList(virtualNetworkId)
    : undefined;
  const securityGroupFilter = virtualNetworkId
    ? securityGroupFilterForVirtualNetworkList(virtualNetworkId)
    : undefined;

  const {
    data: subnets = [],
    isPending: subnetsLoading,
    isError: subnetsError,
    refetch: refetchSubnets,
  } = useSubnets(subnetFilter ? { filter: subnetFilter } : {}, {
    enabled: Boolean(virtualNetworkId),
  });

  const {
    data: securityGroups = [],
    isPending: securityGroupsLoading,
    isError: securityGroupsError,
    refetch: refetchSecurityGroups,
  } = useSecurityGroups(securityGroupFilter ? { filter: securityGroupFilter } : {}, {
    enabled: Boolean(virtualNetworkId),
  });

  const subnetOptions = subnets.map((subnet) => ({
    value: subnet.id,
    label: resourceDisplayName(subnet.metadata, subnet.id),
  }));

  const securityGroupOptions = securityGroups.map((group) => ({
    value: group.id,
    label: resourceDisplayName(group.metadata, group.id),
  }));

  const hasRowError = subnetsError || securityGroupsError;

  return (
    <StackItem key={`bm-net-att-${index}`}>
      {hasRowError ? (
        <Stack>
          <Alert variant="danger" isInline title={t('catalogProvision.networking.loadError')}>
            <Button
              variant="link"
              isInline
              onClick={() => {
                void refetchSubnets();
                void refetchSecurityGroups();
              }}
            >
              {t('catalogProvision.actions.retry')}
            </Button>
          </Alert>
        </Stack>
      ) : null}
      <Stack hasGutter>
        <SelectField
          name={`${attachmentPath}.interface`}
          label={t('catalogProvision.bareMetal.fields.interface')}
          fieldId={`bm-nic-${index}`}
          isRequired
          isLoading={isInterfaceLoading}
          loadingPlaceholder={loadingPlaceholder}
          placeholder={t('catalogProvision.bareMetal.placeholders.selectInterface')}
          options={interfaces.map((i) => ({ value: i.name, label: i.name }))}
          autoSelectSingleOption
          isDisabled={interfaces.length === 0}
        />

        <SelectField
          name={`${attachmentPath}.virtualNetwork`}
          label={t('catalogProvision.bareMetal.fields.virtualNetwork')}
          fieldId={`bm-vn-${index}`}
          isRequired
          autoSelectSingleOption
          isLoading={virtualNetworksLoading}
          loadingPlaceholder={loadingPlaceholder}
          placeholder={t('catalogProvision.vm.placeholders.selectVirtualNetwork')}
          options={virtualNetworks.map((vn) => ({
            value: vn.id,
            label: resourceDisplayName(vn.metadata as never, vn.id),
          }))}
        />

        <SelectField
          name={`${attachmentPath}.subnet`}
          label={t('catalogProvision.bareMetal.fields.subnet')}
          fieldId={`bm-subnet-${index}`}
          isRequired
          autoSelectSingleOption
          isLoading={subnetsLoading}
          isDisabled={!virtualNetworkId}
          loadingPlaceholder={loadingPlaceholder}
          placeholder={t('catalogProvision.vm.placeholders.selectSubnet')}
          options={subnetOptions}
        />

        <MultiSelectField
          name={`${attachmentPath}.securityGroups`}
          label={t('catalogProvision.bareMetal.fields.securityGroup')}
          fieldId={`bm-sg-${index}`}
          isRequired
          autoSelectSingleOption
          isLoading={securityGroupsLoading}
          isDisabled={!virtualNetworkId}
          loadingPlaceholder={loadingPlaceholder}
          placeholder={t('catalogProvision.vm.placeholders.selectSecurityGroup')}
          options={securityGroupOptions}
        />

        <Checkbox
          isChecked={Boolean(attachment.primary)}
          onChange={(checked) => {
            if (!checked) {
              return;
            }
            attachmentValues.forEach((_, otherIndex) => {
              void onSetFieldValue(
                `spec.networking.attachments.${otherIndex}.primary`,
                otherIndex === index,
              );
            });
          }}
          label={t('catalogProvision.bareMetal.fields.primary')}
          aria-label={t('catalogProvision.bareMetal.fields.primary')}
          id={`bm-primary-${index}`}
        />

        {canRemove ? (
          <Button
            variant="link"
            isInline
            onClick={() => onRemove()}
            aria-label={t('catalogProvision.bareMetal.actions.removeNetworkInterface')}
          >
            {t('catalogProvision.bareMetal.actions.removeNetworkInterface')}
          </Button>
        ) : null}
      </Stack>
    </StackItem>
  );
};
