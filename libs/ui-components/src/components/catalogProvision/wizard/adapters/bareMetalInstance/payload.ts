import { MessageInitShape } from '@bufbuild/protobuf';

import { BareMetalInstanceRunStrategy, BareMetalInstanceSchema } from '@osac/types';

import type { BareMetalInstanceWizardValues } from './fields';

export const buildBareMetalInstanceCreatePayload = (
  values: BareMetalInstanceWizardValues,
): MessageInitShape<typeof BareMetalInstanceSchema> => {
  const sshKey = values.spec.sshKey.trim();
  const userData = values.spec.userData.trim();
  const attachments = values.spec.networking.attachments ?? [];

  const bmi = {
    metadata: { name: values.metadata.name.trim(), project: values.metadata.project },
    spec: {
      catalogItem: {
        id: values.catalogItemId,
      },
      runStrategy: BareMetalInstanceRunStrategy.ALWAYS,
      ...(sshKey && { sshPublicKey: sshKey }),
      ...(userData && { userData }),
      ...(attachments.length > 0 && {
        networkAttachments: attachments.map((attachment) => {
          const subnetId = attachment.subnet;
          const securityGroupIds = attachment.securityGroups ?? [];
          return {
            subnet: { id: subnetId },
            securityGroups: securityGroupIds.map((id) => ({ id })),
            ...(attachment.interface ? { interface: attachment.interface } : {}),
            ...(attachments.length > 1 ? { primary: attachment.primary } : {}),
          };
        }),
      }),
      ...(values.spec.networking.autoExternalIpAttachment
        ? { autoExternalIpAttachment: true }
        : {}),
    },
  };

  return bmi;
};
