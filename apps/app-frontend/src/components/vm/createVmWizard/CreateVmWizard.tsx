/**
 * flow: create-virtual-machine-wizard
 * steps: cvm_modal_open, cvm_wizard_template, cvm_wizard_customization, cvm_wizard_review_create
 *
 * WIZARD_TEMPLATE_ONLY (2026): only **create from template** is active; new + clone paths are commented
 * in this file and in stepIds / BFF createVmWizard. RESTORE when fulfillment implements those flows.
 *
 * PatternFly Wizard (WizardNav) inside Modal; step transitions via BFF session API.
 * Per-step operate / validate contract: docs/specs/ui-flows/create-virtual-machine-wizard.yaml (step_worksheets).
 */
import {
  Alert,
  Bullseye,
  Button,
  Flex,
  Modal,
  ModalHeader,
  Spinner,
  Wizard,
  WizardFooterWrapper,
  WizardStep,
} from '@patternfly/react-core'
import type { ComputeInstance, DemoTenantId } from '@osac/api-contracts'
import {
  CreateVmWizardApiError,
  type WizardSessionResponse,
  abandonWizardSession,
  advanceWizardSession,
  backWizardSession,
  finalizeWizardSession,
  startWizardSession,
} from '../../../api/createVmWizardClient'
import { css } from '@emotion/css'
import { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from 'react'
import {
  INITIAL_STATE,
  draftFromSession,
  parseTemplateAdditionalDisksGibInput,
  parseTemplateBootDiskGibInput,
  parseTemplateCoresInput,
  parseTemplateMemoryGibInput,
} from './constants'
import { getWizardOrderedSteps } from './stepIds'
import {
  // WIZARD_TEMPLATE_ONLY — RESTORE when new/clone flows return:
  // BootSourceStep,
  // CloneSourceStep,
  // ComputeStep,
  CustomizationStep,
  // DeploymentStep,
  // GuestOsStep,
  ReviewStep,
  TemplateStep,
} from './steps/WizardSteps'
import type { CreateVmWizardHandle, DeploymentMode, WizardState } from './types'
export type { CreateVmWizardHandle, DeploymentMode } from './types'

const apiAlertCss = css`
  margin-bottom: var(--pf-t--global--spacer--md);
`

const bullseyeLoadingCss = css`
  min-height: 320px;
`

const errorAlertCss = css`
  max-width: 480px;
`

const closeButtonCss = css`
  margin-top: var(--pf-t--global--spacer--md);
`

const footerFlexCss = css`
  width: 100%;
`

const STEP_LABELS: Record<string, string> = {
  // RESTORE deployment / guest-os / boot-source / compute / clone-source labels when those steps return.
  template: 'Templates',
  customization: 'Customization',
  review: 'Review',
}

interface Props {
  existingVms: ComputeInstance[]
  tenant: DemoTenantId
  onProvision: (vm: ComputeInstance, meta: { mode: DeploymentMode }) => void
  defaultMode?: DeploymentMode
}

function canProceedLocal(stepId: string, state: WizardState): boolean {
  switch (stepId) {
    case 'template':
      return !!state.selectedTemplateId
    case 'customization':
      return (
        !!state.templateVmName.trim() &&
        parseTemplateBootDiskGibInput(state.templateBootDiskSizeGib) !== null &&
        parseTemplateCoresInput(state.templateCores) !== null &&
        parseTemplateMemoryGibInput(state.templateMemoryGib) !== null &&
        parseTemplateAdditionalDisksGibInput(state.templateAdditionalDisksGibRaw) !== null
      )
    default:
      return true
  }
}

export const CreateVmWizard = forwardRef<CreateVmWizardHandle, Props>(function CreateVmWizard(
  /** WIZARD_TEMPLATE_ONLY: default was `'new'` — RESTORE when deployment picker returns. */
  { existingVms, tenant: _tenant, onProvision, defaultMode = 'template' },
  ref,
) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState<WizardSessionResponse | null>(null)
  const [draft, setDraft] = useState<WizardState>(() =>
    draftFromSession({ ...INITIAL_STATE, mode: defaultMode }),
  )
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [pending, setPending] = useState(false)
  /** RESTORE: second tuple element was `cloneSearch` for CloneSourceStep. */
  const [, setCloneSearch] = useState('')

  const resetLocal = useCallback(() => {
    setSession(null)
    setDraft(draftFromSession({ ...INITIAL_STATE, mode: defaultMode }))
    setFieldErrors({})
    setCloneSearch('')
  }, [defaultMode])

  const runStart = useCallback(async (body: Parameters<typeof startWizardSession>[0]) => {
    setLoading(true)
    setFieldErrors({})
    try {
      const s = await startWizardSession(body)
      setSession(s)
      setDraft(draftFromSession(s.draft as Partial<WizardState>))
    } catch (err) {
      const msg =
        err instanceof CreateVmWizardApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : String(err)
      setFieldErrors({ _api: msg })
    } finally {
      setLoading(false)
    }
  }, [])

  useImperativeHandle(ref, () => ({
    open() {
      resetLocal()
      setIsOpen(true)
      void runStart({ entry: 'dashboard' })
    },
    openFromTemplate(templateId) {
      resetLocal()
      setIsOpen(true)
      void runStart({ entry: 'catalog', presetTemplateId: templateId })
    },
    openFromClone(_sourceVmId) {
      // WIZARD_TEMPLATE_ONLY — RESTORE when fulfillment supports clone:
      // resetLocal(); setIsOpen(true); void runStart({ entry: 'clone_drawer', presetCloneSourceVmId: sourceVmId })
      void _sourceVmId
    },
  }))

  const update = useCallback(<K extends keyof WizardState>(key: K, value: WizardState[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }, [])

  const close = useCallback(async () => {
    if (session?.sessionId) {
      try {
        await abandonWizardSession(session.sessionId)
      } catch {
        /* ignore */
      }
    }
    setIsOpen(false)
    resetLocal()
  }, [session?.sessionId, resetLocal])

  const orderedSteps = useMemo(() => {
    if (!session) return [] as string[]
    return getWizardOrderedSteps(draft.mode, session.skipDeployment)
  }, [session, draft.mode])

  const isFirst = session ? session.activeIndex <= 0 : true
  const isReview = session?.activeStepId === 'review'
  const canNext = session ? canProceedLocal(session.activeStepId, draft) : false

  const handleBack = useCallback(async () => {
    if (!session?.sessionId || isFirst) return
    setPending(true)
    setFieldErrors({})
    try {
      const s = await backWizardSession(session.sessionId)
      setSession(s)
      setDraft(draftFromSession(s.draft as Partial<WizardState>))
    } catch (err) {
      const msg =
        err instanceof CreateVmWizardApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : String(err)
      setFieldErrors({ _api: msg })
    } finally {
      setPending(false)
    }
  }, [session, isFirst])

  const handleNextOrCreate = useCallback(async () => {
    if (!session?.sessionId) return
    setPending(true)
    setFieldErrors({})
    try {
      if (isReview) {
        const { object } = await finalizeWizardSession(session.sessionId, draft)
        onProvision(object, { mode: draft.mode })
        setIsOpen(false)
        resetLocal()
        return
      }
      const s = await advanceWizardSession(session.sessionId, session.activeStepId, draft)
      setSession(s)
      setDraft(draftFromSession(s.draft as Partial<WizardState>))
    } catch (err) {
      if (err instanceof CreateVmWizardApiError && err.fieldErrors) {
        setFieldErrors(err.fieldErrors)
      } else {
        const msg =
          err instanceof CreateVmWizardApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : String(err)
        setFieldErrors({ _api: msg })
      }
    } finally {
      setPending(false)
    }
  }, [session, isReview, draft, onProvision, resetLocal])

  const renderStepBody = (stepId: string) => {
    switch (stepId) {
      /*
      RESTORE when new + clone flows return:
      case 'deployment':
        return <DeploymentStep state={draft} update={update} />
      case 'guest-os':
        return <GuestOsStep state={draft} update={update} />
      case 'boot-source':
        return <BootSourceStep state={draft} update={update} />
      case 'compute':
        return <ComputeStep state={draft} update={update} />
      case 'clone-source':
        return (
          <CloneSourceStep
            state={draft}
            update={update}
            search={cloneSearch}
            setSearch={setCloneSearch}
            vms={existingVms}
          />
        )
      */
      case 'template':
        return <TemplateStep state={draft} update={update} />
      case 'customization':
        return <CustomizationStep state={draft} update={update} />
      case 'review':
        return <ReviewStep state={draft} update={update} vms={existingVms} />
      default:
        return null
    }
  }

  const hasFieldErrors = Object.keys(fieldErrors).length > 0

  const renderApiAlert = (stepId: string) =>
    hasFieldErrors && session && session.activeStepId === stepId ? (
      <Alert variant="danger" isInline title="Could not continue" className={apiAlertCss}>
        {fieldErrors._api ??
          Object.entries(fieldErrors)
            .filter(([k]) => k !== '_api')
            .map(([k, v]) => (
              <div key={k}>
                <strong>{k}</strong>: {v}
              </div>
            ))}
      </Alert>
    ) : null

  const hideModalBoxClose = false
  /** RESTORE: `session?.activeStepId === 'deployment'` when deployment step returns. */
  const isDeploymentStep = false

  return (
    <Modal
      isOpen={isOpen}
      onClose={hideModalBoxClose ? undefined : close}
      onEscapePress={
        hideModalBoxClose
          ? () => {
              void close()
            }
          : undefined
      }
      variant="large"
      width="min(980px, 86vw)"
      maxWidth="88vw"
      aria-label="Create virtual machine wizard"
      ouiaId="create-vm-wizard-modal"
    >
      {loading ? (
        <Bullseye className={bullseyeLoadingCss}>
          <Spinner aria-label="Loading wizard" />
        </Bullseye>
      ) : !session ? (
        <Bullseye className={bullseyeLoadingCss}>
          {hasFieldErrors ? (
            <>
              <Alert variant="danger" title="Wizard could not start" className={errorAlertCss}>
                {fieldErrors._api ?? 'An error occurred.'}
              </Alert>
              <Button variant="primary" onClick={() => void close()} className={closeButtonCss}>
                Close
              </Button>
            </>
          ) : (
            <Spinner aria-label="Loading wizard" />
          )}
        </Bullseye>
      ) : (
        <>
          <ModalHeader
            title="Create virtual machine"
            description="Select a template, customize, and provision your new workload."
          />
          <Wizard
            key={`${session.sessionId}-${session.activeIndex}`}
            className={[
              'create-vm-wizard',
              isDeploymentStep ? 'create-vm-wizard--deployment-step' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            navAriaLabel="Create virtual machine steps"
            startIndex={session.activeIndex + 1}
            height="min(600px, calc(100vh - 160px))"
            footer={
              <WizardFooterWrapper>
                <Flex
                  className={footerFlexCss}
                  justifyContent={{ default: 'justifyContentFlexStart' }}
                  alignItems={{ default: 'alignItemsCenter' }}
                  flexWrap={{ default: 'wrap' }}
                  gap={{ default: 'gapMd' }}
                >
                  <Button
                    variant="secondary"
                    onClick={handleBack}
                    isDisabled={isFirst || pending}
                    isAriaDisabled={isFirst || pending}
                  >
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => void handleNextOrCreate()}
                    isDisabled={!canNext || pending}
                    isAriaDisabled={!canNext || pending}
                    isLoading={pending}
                  >
                    {isReview ? 'Create virtual machine' : 'Next'}
                  </Button>
                  <Button variant="link" onClick={() => void close()} isDisabled={pending}>
                    Cancel
                  </Button>
                </Flex>
              </WizardFooterWrapper>
            }
            onClose={close}
          >
            {orderedSteps.map((stepId) => (
              <WizardStep key={stepId} id={stepId} name={STEP_LABELS[stepId] ?? stepId}>
                {renderApiAlert(stepId)}
                {renderStepBody(stepId)}
              </WizardStep>
            ))}
          </Wizard>
        </>
      )}
    </Modal>
  )
})
