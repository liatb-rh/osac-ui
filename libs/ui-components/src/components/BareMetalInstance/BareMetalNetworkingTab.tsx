import { useMemo } from 'react';
import { Bullseye, Card, CardBody, CardTitle, Spinner, Stack } from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';

import type { BareMetalInstance, BareMetalNetworkAttachmentStatus } from '@osac/types';

import { useExternalIPAttachments } from '../../api/v1/external-ip';
import { useSecurityGroups, useSubnets, useVirtualNetworks } from '../../api/v1/networking';
import { useTranslation } from '../../hooks/useTranslation';
import { SubtleContent } from '../SubtleContent/SubtleContent';

interface BareMetalNetworkingTabProps {
  instance: BareMetalInstance;
}

const ipForStatus = (status?: BareMetalNetworkAttachmentStatus) => status?.ipAddress ?? '—';

const BareMetalNetworkingTab = ({ instance }: BareMetalNetworkingTabProps) => {
  const { t } = useTranslation();

  const { data: virtualNetworks = [], isLoading: virtualNetworksLoading } = useVirtualNetworks();
  const { data: subnets = [], isLoading: subnetsLoading } = useSubnets();
  const { data: securityGroups = [], isLoading: securityGroupsLoading } = useSecurityGroups();

  const networkingRows = useMemo(() => {
    const attachments = instance.spec?.networkAttachments ?? [];
    const statuses = instance.status?.networkAttachmentStatuses ?? [];

    return attachments.map((attachment, index) => {
      const status =
        (attachment.interface && statuses.find((s) => s.interface === attachment.interface)) ||
        statuses[index];

      const subnetId = attachment.subnet?.id ?? '';
      const subnet = subnets.find((s) => s.id === subnetId);
      const virtualNetworkId = subnet?.spec?.virtualNetwork?.id ?? '';
      const virtualNetwork = virtualNetworks.find((vn) => vn.id === virtualNetworkId);

      const securityGroupIds = attachment.securityGroups?.map((sg) => sg.id) ?? [];
      const securityGroupNames = securityGroupIds
        .map((id) => securityGroups.find((sg) => sg.id === id)?.metadata?.name ?? id)
        .join(', ');

      return {
        interfaceName: attachment.interface ?? '—',
        virtualNetwork: (virtualNetwork?.metadata?.name ?? virtualNetworkId) || '—',
        subnet: (subnet?.metadata?.name ?? subnetId) || '—',
        securityGroups: securityGroupNames || '—',
        primary: Boolean(status?.primary ?? attachment.primary),
        ipAddress: ipForStatus(status),
      };
    });
  }, [
    instance.spec?.networkAttachments,
    instance.status?.networkAttachmentStatuses,
    subnets,
    virtualNetworks,
    securityGroups,
  ]);

  const externalIpAttachmentsQuery = useExternalIPAttachments('baremetalInstance', instance.id);
  const externalIpAttachments = externalIpAttachmentsQuery.data ?? [];

  if (virtualNetworksLoading || subnetsLoading || securityGroupsLoading) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <Stack hasGutter>
      <Card isFullHeight>
        <CardTitle>{t('Networking')}</CardTitle>
        <CardBody>
          {networkingRows.length > 0 ? (
            <Table aria-label={t('Networking')} variant="compact" borders>
              <Thead>
                <Tr>
                  <Th>{t('Interface')}</Th>
                  <Th>{t('Virtual network')}</Th>
                  <Th>{t('Subnet')}</Th>
                  <Th>{t('Security groups')}</Th>
                  <Th>{t('Primary')}</Th>
                  <Th>{t('IP address')}</Th>
                </Tr>
              </Thead>
              <Tbody>
                {networkingRows.map((row, index) => (
                  <Tr key={`bm-net-${index}`}>
                    <Td dataLabel={t('Interface')}>{row.interfaceName}</Td>
                    <Td dataLabel={t('Virtual network')}>{row.virtualNetwork}</Td>
                    <Td dataLabel={t('Subnet')}>{row.subnet}</Td>
                    <Td dataLabel={t('Security groups')}>{row.securityGroups}</Td>
                    <Td dataLabel={t('Primary')}>{row.primary ? t('Yes') : t('No')}</Td>
                    <Td dataLabel={t('IP address')}>{row.ipAddress}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          ) : (
            <SubtleContent component="p">{t('No network attachments configured.')}</SubtleContent>
          )}
        </CardBody>
      </Card>

      <Card isFullHeight>
        <CardTitle>{t('External IP')}</CardTitle>
        <CardBody>
          {externalIpAttachmentsQuery.isLoading ? null : externalIpAttachments.length > 0 ? (
            <Table aria-label={t('External IPs')} variant="compact" borders>
              <Thead>
                <Tr>
                  <Th>{t('External IP address')}</Th>
                  <Th>{t('State')}</Th>
                </Tr>
              </Thead>
              <Tbody>
                {externalIpAttachments.map((att) => (
                  <Tr key={att.id}>
                    <Td dataLabel={t('External IP address')}>
                      {att.status?.externalIpAddress ?? '—'}
                    </Td>
                    <Td dataLabel={t('State')}>{att.status?.state ?? '—'}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          ) : (
            <SubtleContent component="p">{t('No external IP attached.')}</SubtleContent>
          )}
        </CardBody>
      </Card>
    </Stack>
  );
};

export default BareMetalNetworkingTab;
