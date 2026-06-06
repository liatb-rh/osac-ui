/**
 * flow: cluster-service-catalog
 * step: csc_create_cluster_modal
 */
import { useCallback, useState } from 'react'
import { css } from '@emotion/css'
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ExpandableSection,
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Gallery,
  HelperText,
  HelperTextItem,
  Label,
  LabelGroup,
  MenuToggle,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  NumberInput,
  Select,
  SelectList,
  SelectOption,
  Spinner,
  TextInput,
  Title,
} from '@patternfly/react-core'
import type { ClusterCatalogItem } from '@osac/api-contracts'
import { useCreateCluster } from '../../hooks/useCreateCluster'
import {
  useClusterCatalogItems,
  useSubnets,
  useVirtualNetworks,
} from '../../hooks/useClusterCatalogItems'
import { useSecurityGroups } from '../../hooks/useNetworking'

interface CreateClusterModalProps {
  onClose: () => void
}

type Step = 'catalog' | 'configure'

interface FormState {
  name: string
  sshPublicKey: string
  releaseImage: string
  podCidr: string
  serviceCidr: string
  virtualNetworkId: string
  subnetId: string
  securityGroupIds: string[]
  fieldValues: Record<string, number | string>
}

const submitErrorAlertCss = css`
  margin-bottom: 1rem;
`

const catalogCardCss = css`
  border: 1px solid var(--pf-t--global--border--color--default);
  border-radius: var(--pf-t--global--border--radius--medium);
`

const networkingTitleCss = css`
  margin-top: 1rem;
`

const menuToggleFullWidthCss = css`
  width: 100%;
`

const labelGroupMarginCss = css`
  margin-top: 0.5rem;
`

const INITIAL_FORM: FormState = {
  name: '',
  sshPublicKey: '',
  releaseImage: '',
  podCidr: '',
  serviceCidr: '',
  virtualNetworkId: '',
  subnetId: '',
  securityGroupIds: [],
  fieldValues: {},
}

function buildPayload(catalogItem: ClusterCatalogItem, form: FormState) {
  const nodeSets: Record<string, { size: number }> = {}
  for (const fd of catalogItem.fieldDefinitions ?? []) {
    if (fd.path.startsWith('spec.node_sets.') && fd.path.endsWith('.size')) {
      const parts = fd.path.split('.')
      const nodeSetKey = parts[2]
      nodeSets[nodeSetKey] = {
        size: Number(form.fieldValues[fd.path] ?? (fd.default as { value?: number })?.value ?? 1),
      }
    }
  }
  return {
    metadata: { name: form.name },
    spec: {
      catalogItem: catalogItem.id,
      nodeSets,
      sshPublicKey: form.sshPublicKey || undefined,
      releaseImage: form.releaseImage || undefined,
      network: {
        virtualNetworkRef: form.virtualNetworkId,
        subnetRef: form.subnetId,
        securityGroupRefs: form.securityGroupIds.length > 0 ? form.securityGroupIds : undefined,
        podCidr: form.podCidr || undefined,
        serviceCidr: form.serviceCidr || undefined,
      },
    },
  }
}

export function CreateClusterModal({ onClose }: CreateClusterModalProps) {
  const [step, setStep] = useState<Step>('catalog')
  const [selectedItem, setSelectedItem] = useState<ClusterCatalogItem | null>(null)
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [sgSelectOpen, setSgSelectOpen] = useState(false)

  const {
    data: catalogItems,
    isLoading: catalogLoading,
    error: catalogError,
    refetch: retryCatalog,
  } = useClusterCatalogItems()
  const { data: virtualNetworks, isLoading: vnLoading } = useVirtualNetworks()
  const { data: subnets, isLoading: subnetLoading } = useSubnets(form.virtualNetworkId || undefined)
  const { data: securityGroups } = useSecurityGroups()
  const { mutateAsync: createCluster, isPending } = useCreateCluster()

  const handleSelectItem = useCallback((item: ClusterCatalogItem) => {
    setSelectedItem(item)
    const defaults: Record<string, number | string> = {}
    for (const fd of item.fieldDefinitions ?? []) {
      if (fd.default && typeof fd.default === 'object' && 'value' in fd.default) {
        defaults[fd.path] = (fd.default as { value: number | string }).value
      }
    }
    setForm({ ...INITIAL_FORM, fieldValues: defaults })
    setStep('configure')
  }, [])

  const handleBack = useCallback(() => {
    setStep('catalog')
    setSelectedItem(null)
    setSubmitError(null)
  }, [])

  function validateName(val: string): boolean {
    const valid = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(val) && val.length <= 253
    setNameError(
      valid ? null : 'Name must be lowercase alphanumeric, may contain hyphens, max 253 chars.',
    )
    return valid
  }

  async function handleSubmit() {
    if (!selectedItem) return
    if (!validateName(form.name)) return
    if (!form.virtualNetworkId || !form.subnetId) return
    setSubmitError(null)
    try {
      await createCluster(buildPayload(selectedItem, form) as Parameters<typeof createCluster>[0])
      onClose()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const title = step === 'catalog' ? 'Select a cluster type' : 'Configure cluster'

  return (
    <Modal isOpen onClose={onClose} variant="medium" aria-labelledby="create-cluster-modal-title">
      <ModalHeader title={title} labelId="create-cluster-modal-title" />
      <ModalBody>
        {submitError && (
          <Alert
            variant="danger"
            title="Failed to create cluster"
            isInline
            className={submitErrorAlertCss}
          >
            {submitError}. Please try again.
          </Alert>
        )}

        {step === 'catalog' && (
          <>
            {catalogLoading && <Spinner aria-label="Loading cluster types" />}
            {catalogError && (
              <Alert variant="danger" title="Failed to load catalog" isInline>
                <Button variant="link" isInline onClick={() => retryCatalog()}>
                  Retry
                </Button>
              </Alert>
            )}
            {!catalogLoading && !catalogError && (
              <Gallery hasGutter minWidths={{ default: '250px' }}>
                {(catalogItems ?? []).map((item) => (
                  <Card
                    key={item.id}
                    isClickable
                    isSelectable
                    isSelected={selectedItem?.id === item.id}
                    onClick={() => handleSelectItem(item)}
                    className={catalogCardCss}
                  >
                    <CardHeader>
                      <CardTitle>{item.title}</CardTitle>
                    </CardHeader>
                    <CardBody>{item.description}</CardBody>
                  </Card>
                ))}
              </Gallery>
            )}
          </>
        )}

        {step === 'configure' && selectedItem && (
          <Form>
            <FormGroup label="Cluster name" isRequired fieldId="cluster-name">
              <TextInput
                id="cluster-name"
                value={form.name}
                onChange={(_e, v) => {
                  setForm((f) => ({ ...f, name: v }))
                  validateName(v)
                }}
                validated={nameError ? 'error' : 'default'}
                placeholder="my-cluster-name"
                isRequired
              />
              {nameError && (
                <HelperText>
                  <HelperTextItem variant="error">{nameError}</HelperTextItem>
                </HelperText>
              )}
            </FormGroup>

            {(selectedItem.fieldDefinitions ?? [])
              .filter((fd) => fd.editable)
              .map((fd) => {
                const isInt = fd.validationSchema?.includes('"integer"')
                const val = form.fieldValues[fd.path]
                return (
                  <FormGroup key={fd.path} label={fd.displayName} fieldId={`field-${fd.path}`}>
                    {isInt ? (
                      <NumberInput
                        id={`field-${fd.path}`}
                        value={typeof val === 'number' ? val : Number(val ?? 1)}
                        min={1}
                        onMinus={() =>
                          setForm((f) => ({
                            ...f,
                            fieldValues: {
                              ...f.fieldValues,
                              [fd.path]: Math.max(1, Number(f.fieldValues[fd.path] ?? 1) - 1),
                            },
                          }))
                        }
                        onPlus={() =>
                          setForm((f) => ({
                            ...f,
                            fieldValues: {
                              ...f.fieldValues,
                              [fd.path]: Number(f.fieldValues[fd.path] ?? 1) + 1,
                            },
                          }))
                        }
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            fieldValues: {
                              ...f.fieldValues,
                              [fd.path]: Number((e.target as HTMLInputElement).value),
                            },
                          }))
                        }
                      />
                    ) : (
                      <TextInput
                        id={`field-${fd.path}`}
                        value={String(val ?? '')}
                        onChange={(_e, v) =>
                          setForm((f) => ({
                            ...f,
                            fieldValues: { ...f.fieldValues, [fd.path]: v },
                          }))
                        }
                      />
                    )}
                  </FormGroup>
                )
              })}

            <FormGroup label="SSH public key" fieldId="ssh-key">
              <TextInput
                id="ssh-key"
                value={form.sshPublicKey}
                onChange={(_e, v) => setForm((f) => ({ ...f, sshPublicKey: v }))}
                placeholder="ssh-rsa AAAA…"
              />
              <HelperText>
                <HelperTextItem>Used to access worker nodes</HelperTextItem>
              </HelperText>
            </FormGroup>

            <Title headingLevel="h3" size="md" className={networkingTitleCss}>
              Networking
            </Title>

            <FormGroup label="Virtual Network" isRequired fieldId="virtual-network">
              <FormSelect
                id="virtual-network"
                value={form.virtualNetworkId}
                onChange={(_e, v) => setForm((f) => ({ ...f, virtualNetworkId: v, subnetId: '' }))}
                isDisabled={vnLoading}
                aria-label="Select virtual network"
              >
                <FormSelectOption
                  value=""
                  label={vnLoading ? 'Loading…' : 'Select a virtual network'}
                  isDisabled
                />
                {(virtualNetworks ?? []).map((vn) => (
                  <FormSelectOption
                    key={vn.id}
                    value={vn.id}
                    label={`${vn.metadata.name}${vn.spec.ipv4Cidr ? ` (${vn.spec.ipv4Cidr})` : ''}`}
                  />
                ))}
              </FormSelect>
            </FormGroup>

            <FormGroup label="Subnet" isRequired fieldId="subnet">
              <FormSelect
                id="subnet"
                value={form.subnetId}
                onChange={(_e, v) => setForm((f) => ({ ...f, subnetId: v }))}
                isDisabled={!form.virtualNetworkId || subnetLoading}
                aria-label="Select subnet"
              >
                <FormSelectOption
                  value=""
                  label={
                    !form.virtualNetworkId
                      ? 'Select a virtual network first'
                      : subnetLoading
                        ? 'Loading…'
                        : 'Select a subnet'
                  }
                  isDisabled
                />
                {(subnets ?? []).map((s) => (
                  <FormSelectOption
                    key={s.id}
                    value={s.id}
                    label={`${s.metadata.name}${s.spec.ipv4Cidr ? ` (${s.spec.ipv4Cidr})` : ''}`}
                  />
                ))}
              </FormSelect>
            </FormGroup>

            <FormGroup label="Security Groups" fieldId="security-groups">
              <Select
                id="security-groups"
                isOpen={sgSelectOpen}
                onOpenChange={setSgSelectOpen}
                toggle={(ref) => (
                  <MenuToggle
                    ref={ref}
                    onClick={() => setSgSelectOpen((o) => !o)}
                    isExpanded={sgSelectOpen}
                    className={menuToggleFullWidthCss}
                    aria-label="Select security groups"
                  >
                    {form.securityGroupIds.length === 0
                      ? 'None (use defaults)'
                      : `${form.securityGroupIds.length} selected`}
                  </MenuToggle>
                )}
              >
                <SelectList>
                  {(securityGroups ?? []).map((sg) => (
                    <SelectOption
                      key={sg.id}
                      value={sg.id}
                      hasCheckbox
                      isSelected={form.securityGroupIds.includes(sg.id)}
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          securityGroupIds: f.securityGroupIds.includes(sg.id)
                            ? f.securityGroupIds.filter((id) => id !== sg.id)
                            : [...f.securityGroupIds, sg.id],
                        }))
                      }
                    >
                      {sg.metadata.name}
                    </SelectOption>
                  ))}
                </SelectList>
              </Select>
              {form.securityGroupIds.length > 0 && (
                <LabelGroup className={labelGroupMarginCss} aria-label="Selected security groups">
                  {form.securityGroupIds.map((id) => {
                    const sg = (securityGroups ?? []).find((s) => s.id === id)
                    return (
                      <Label
                        key={id}
                        onClose={() =>
                          setForm((f) => ({
                            ...f,
                            securityGroupIds: f.securityGroupIds.filter((sid) => sid !== id),
                          }))
                        }
                        closeBtnAriaLabel={`Remove ${sg?.metadata.name ?? id}`}
                      >
                        {sg?.metadata.name ?? id}
                      </Label>
                    )
                  })}
                </LabelGroup>
              )}
              <HelperText>
                <HelperTextItem>Optional — leave empty to use defaults</HelperTextItem>
              </HelperText>
            </FormGroup>

            <ExpandableSection toggleText="Advanced networking">
              <FormGroup label="Pod CIDR" fieldId="pod-cidr">
                <TextInput
                  id="pod-cidr"
                  value={form.podCidr}
                  onChange={(_e, v) => setForm((f) => ({ ...f, podCidr: v }))}
                  placeholder="10.128.0.0/14 (default)"
                />
              </FormGroup>
              <FormGroup label="Service CIDR" fieldId="service-cidr">
                <TextInput
                  id="service-cidr"
                  value={form.serviceCidr}
                  onChange={(_e, v) => setForm((f) => ({ ...f, serviceCidr: v }))}
                  placeholder="172.30.0.0/16 (default)"
                />
              </FormGroup>
            </ExpandableSection>
          </Form>
        )}
      </ModalBody>
      <ModalFooter>
        {step === 'configure' && (
          <>
            <Button
              variant="primary"
              onClick={handleSubmit}
              isDisabled={isPending || !form.name || !form.virtualNetworkId || !form.subnetId}
              icon={isPending ? <Spinner size="sm" aria-label="Creating cluster" /> : undefined}
            >
              {isPending ? 'Creating…' : 'Create cluster'}
            </Button>
            <Button variant="secondary" onClick={handleBack} isDisabled={isPending}>
              Back
            </Button>
          </>
        )}
        <Button variant="link" onClick={onClose} isDisabled={isPending}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )
}
