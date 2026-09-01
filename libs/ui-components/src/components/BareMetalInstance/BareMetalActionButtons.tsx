import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Flex } from '@patternfly/react-core';
import DumpsterIcon from '@patternfly/react-icons/dist/esm/icons/dumpster-icon';
import GlobeIcon from '@patternfly/react-icons/dist/esm/icons/globe-icon';
import PlayIcon from '@patternfly/react-icons/dist/esm/icons/play-icon';
import StopIcon from '@patternfly/react-icons/dist/esm/icons/stop-icon';
import SyncAltIcon from '@patternfly/react-icons/dist/esm/icons/sync-alt-icon';

import type { BareMetalInstance } from '@osac/types';
import { BareMetalInstanceState } from '@osac/types';

import BareMetalDeleteConfirmModal from './BareMetalDeleteConfirmModal';
import { useBareMetalActions } from './useBareMetalActions';
import { useExternalIPAttachments } from '../../api/v1/external-ip';
import { useTranslation } from '../../hooks/useTranslation';
import AttachExternalIpModal from '../Resource/AttachExternalIpModal';

interface BareMetalActionButtonsProps {
  instance: BareMetalInstance;
}

const BareMetalActionButtons = ({ instance }: BareMetalActionButtonsProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);

  const { canStart, canStop, canRestart, canDelete, start, stop, restart } =
    useBareMetalActions(instance);

  const isRunning = instance.status?.state === BareMetalInstanceState.RUNNING;
  const { data: externalIpAttachments = [] } = useExternalIPAttachments(
    'baremetalInstance',
    instance.id,
  );
  const canAttachExternalIp = isRunning && externalIpAttachments.length === 0;

  return (
    <>
      {deleteOpen && (
        <BareMetalDeleteConfirmModal
          instance={instance}
          onClose={() => setDeleteOpen(false)}
          onSuccess={() => navigate('/bare-metal')}
        />
      )}
      {attachOpen && (
        <AttachExternalIpModal
          target="baremetalInstance"
          targetId={instance.id}
          onClose={() => setAttachOpen(false)}
          onSuccess={() => setAttachOpen(false)}
        />
      )}
      <Flex
        justifyContent={{ default: 'justifyContentFlexEnd' }}
        spaceItems={{ default: 'spaceItemsSm' }}
        flexWrap={{ default: 'wrap' }}
      >
        <Button variant="primary" icon={<PlayIcon />} isDisabled={!canStart} onClick={start}>
          {t('Start')}
        </Button>
        <Button variant="secondary" icon={<StopIcon />} isDisabled={!canStop} onClick={stop}>
          {t('Stop')}
        </Button>
        <Button
          variant="secondary"
          icon={<SyncAltIcon />}
          isDisabled={!canRestart}
          onClick={restart}
        >
          {t('Restart')}
        </Button>
        <Button
          variant="secondary"
          icon={<GlobeIcon />}
          isDisabled={!canAttachExternalIp}
          onClick={() => {
            if (canAttachExternalIp) {
              setAttachOpen(true);
            }
          }}
        >
          {t('Attach external IP')}
        </Button>
        <Button
          variant="danger"
          icon={<DumpsterIcon />}
          isDisabled={!canDelete}
          onClick={() => {
            if (canDelete) {
              setDeleteOpen(true);
            }
          }}
        >
          {t('Delete')}
        </Button>
      </Flex>
    </>
  );
};

export default BareMetalActionButtons;
