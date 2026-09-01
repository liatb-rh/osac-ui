import {
  Alert,
  Bullseye,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Spinner,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { useFormikContext } from 'formik';

import { useProjects } from '@osac/ui-components/api/v1/project';
import { CatalogItem } from '@osac/ui-components/components/catalog/catalogItemDisplay';
import {
  fullProjectPathToQueryFilter,
  getProjectName,
} from '@osac/ui-components/components/Project/utils';
import { getErrorMessage } from '@osac/ui-components/utils/error';

import { BareMetalInstanceWizardValues } from './fields';
import { useTranslation } from '../../../../../hooks/useTranslation';
import { formatReviewScalar } from '../../catalogOverlay';

interface Props {
  catalogItem: CatalogItem | null;
}

export const BareMetalReviewStep = ({ catalogItem }: Props) => {
  const { t } = useTranslation();
  const { values } = useFormikContext<BareMetalInstanceWizardValues>();

  const { data, isLoading, error } = useProjects({
    filter: fullProjectPathToQueryFilter(values.metadata.project),
  });

  if (isLoading) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <Stack hasGutter>
      {!!error && (
        <StackItem>
          <Alert variant="warning" isInline title={t('Failed to fetch project')}>
            {getErrorMessage(error)}
          </Alert>
        </StackItem>
      )}
      <StackItem>
        <DescriptionList
          isHorizontal
          isCompact
          aria-label={t('catalogProvision.steps.review.title')}
        >
          <DescriptionListGroup>
            <DescriptionListTerm>{t('Catalog item')}</DescriptionListTerm>
            <DescriptionListDescription>
              {catalogItem?.title || catalogItem?.metadata?.name || '—'}
            </DescriptionListDescription>
          </DescriptionListGroup>

          <DescriptionListGroup>
            <DescriptionListTerm>{t('Project')}</DescriptionListTerm>
            <DescriptionListDescription>
              {data?.length === 1 ? getProjectName(data[0], t) : values.metadata.project}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>{t('Name')}</DescriptionListTerm>
            <DescriptionListDescription>
              {formatReviewScalar(values.metadata.name)}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>{t('SSH public key')}</DescriptionListTerm>
            <DescriptionListDescription>
              {formatReviewScalar(values.spec.sshKey)}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>{t('User data')}</DescriptionListTerm>
            <DescriptionListDescription>
              {formatReviewScalar(values.spec.userData, true)}
            </DescriptionListDescription>
          </DescriptionListGroup>

          <DescriptionListGroup>
            <DescriptionListTerm>{t('Networking')}</DescriptionListTerm>
            <DescriptionListDescription>
              {values.spec.networking.attachments.map((att, index) => (
                <span key={index}>
                  {att.interface ? `Interface: ${att.interface}` : 'Interface: —'}
                  {` • Virtual network: ${att.virtualNetwork || '—'}`}
                  {` • Subnet: ${att.subnet || '—'}`}
                  {` • Security groups: ${
                    att.securityGroups?.length ? att.securityGroups.join(', ') : '—'
                  }`}
                  {att.primary ? ' (primary)' : ''}
                  {index < values.spec.networking.attachments.length - 1 ? <br /> : null}
                </span>
              ))}
            </DescriptionListDescription>
          </DescriptionListGroup>

          <DescriptionListGroup>
            <DescriptionListTerm>{t('Auto External IP')}</DescriptionListTerm>
            <DescriptionListDescription>
              {values.spec.networking.autoExternalIpAttachment ? t('Enabled') : t('Disabled')}
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      </StackItem>
    </Stack>
  );
};
