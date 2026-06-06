/**
 * flow: manage-virtual-machines
 * step: mvm_list_view | mvm_detail_drawer
 */
import { css } from '@emotion/css'
import {
  Alert,
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Spinner,
} from '@patternfly/react-core'
import type { ComputeInstance } from '@osac/api-contracts'

interface VmDeleteConfirmModalProps {
  vm: ComputeInstance | null
  isOpen: boolean
  isPending: boolean
  /** When true, copy explains the VM will be stopped via PATCH before DELETE. */
  willStopFirst?: boolean
  errorMessage?: string | null
  onClose: () => void
  onConfirm: () => void
}

const errorAlertCss = css`
  margin-top: var(--pf-t--global--spacer--md);
`

export function VmDeleteConfirmModal({
  vm,
  isOpen,
  isPending,
  willStopFirst = false,
  errorMessage,
  onClose,
  onConfirm,
}: VmDeleteConfirmModalProps) {
  if (!vm) return null

  return (
    <Modal
      variant="small"
      isOpen={isOpen}
      onClose={isPending ? undefined : onClose}
      aria-labelledby="vm-delete-confirm-title"
    >
      <ModalHeader
        title={`Delete ${vm.metadata.name}?`}
        titleIconVariant="warning"
        labelId="vm-delete-confirm-title"
      />
      <ModalBody>
        {willStopFirst
          ? 'This virtual machine is still running. It will be stopped first, then deleted permanently. This action cannot be undone.'
          : 'This permanently deletes the virtual machine. This action cannot be undone.'}
        {errorMessage ? (
          <Alert variant="danger" title="Delete failed" className={errorAlertCss}>
            {errorMessage}
          </Alert>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button key="cancel" variant="link" onClick={onClose} isDisabled={isPending}>
          Cancel
        </Button>
        <Button key="delete" variant="danger" onClick={onConfirm} isDisabled={isPending}>
          {isPending ? <Spinner size="sm" aria-label="Deleting virtual machine" /> : 'Delete'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
