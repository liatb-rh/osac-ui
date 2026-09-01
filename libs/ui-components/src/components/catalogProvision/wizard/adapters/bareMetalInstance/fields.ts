import { FormikHelpers } from 'formik';
import { TFunction } from 'i18next';

import { BareMetalInstanceCatalogItem } from '@osac/types';

import {
  getCatalogFieldOverlay,
  overlayDefaultToFormValue,
  readCatalogFieldDefinitions,
} from '../../catalogOverlay';

export const BM_SSH_KEY_WIRE_PATH = 'spec.ssh_public_key';
export const BM_SSH_KEY_FORM_PATH = 'spec.sshKey';

export const BM_USER_DATA_WIRE_PATH = 'spec.user_data';
export const BM_USER_DATA_FORM_PATH = 'spec.userData';

export interface BareMetalInstanceWizardValues {
  catalogItemId: string;
  metadata: {
    name: string;
    project: string;
  };
  spec: {
    sshKey: string;
    userData: string;
    networking: BareMetalInstanceNetworkingValues;
  };
}

export interface BareMetalNetworkAttachmentValue {
  /** Physical NIC name from HostType's `interfaces[]` list. */
  interface: string;
  /** Virtual network id used for scoping VN -> subnet -> security group. */
  virtualNetwork: string;
  subnet: string;
  securityGroups: string[];
  /**
   * Whether this attachment is the primary one for multi-NIC instances.
   * The backend may infer primary implicitly for single-NIC instances.
   */
  primary: boolean;
}

export interface BareMetalInstanceNetworkingValues {
  attachments: BareMetalNetworkAttachmentValue[];
  autoExternalIpAttachment: boolean;
}

export const createEmptyBareMetalInstanceValues = (): BareMetalInstanceWizardValues => ({
  catalogItemId: '',
  metadata: { name: '', project: '' },
  spec: {
    sshKey: '',
    userData: '',
    networking: {
      // Keep the initial model shape simple; the networking step will populate
      // interface/VN/subnet/SG defaults once HostType is resolved.
      attachments: [
        {
          interface: '',
          virtualNetwork: '',
          subnet: '',
          securityGroups: [],
          primary: true,
        },
      ],
      autoExternalIpAttachment: false,
    },
  },
});

export const applyBmCatalogDefaults = (
  catalogItem: BareMetalInstanceCatalogItem,
  helpers: FormikHelpers<BareMetalInstanceWizardValues>,
  t: TFunction,
): void => {
  const definitions = readCatalogFieldDefinitions(catalogItem);

  const sshKeyOverlay = getCatalogFieldOverlay(
    BM_SSH_KEY_WIRE_PATH,
    definitions,
    t('SSH public key'),
  );
  const userDataOverlay = getCatalogFieldOverlay(
    BM_USER_DATA_WIRE_PATH,
    definitions,
    t('User data'),
  );

  const sshDefault = overlayDefaultToFormValue(sshKeyOverlay);
  if (sshDefault !== undefined) {
    void helpers.setFieldValue(BM_SSH_KEY_FORM_PATH, sshDefault);
  }

  const userDataDefault = overlayDefaultToFormValue(userDataOverlay);
  if (userDataDefault !== undefined) {
    void helpers.setFieldValue(BM_USER_DATA_FORM_PATH, userDataDefault);
  }
};
