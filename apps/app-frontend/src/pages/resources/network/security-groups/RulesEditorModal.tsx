import { useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { css } from '@emotion/css'
import {
  Alert,
  Button,
  ExpandableSection,
  FormSelect,
  FormSelectOption,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Spinner,
  TextInput,
} from '@patternfly/react-core'
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import type { Protocol, SecurityGroup, SecurityRule } from '@osac/api-contracts'
import { useUpdateSecurityGroup } from '../../../../hooks/useNetworking'

const modalAlertCss = css`
  margin-bottom: 1rem;
`

export const PROTOCOL_OPTIONS: { value: Protocol; label: string }[] = [
  { value: 'PROTOCOL_ALL', label: 'All' },
  { value: 'PROTOCOL_TCP', label: 'TCP' },
  { value: 'PROTOCOL_UDP', label: 'UDP' },
  { value: 'PROTOCOL_ICMP', label: 'ICMP' },
]

export interface EditableRule extends SecurityRule {
  _key: string
}

export function makeEditable(rules?: SecurityRule[]): EditableRule[] {
  return (rules ?? []).map((r) => ({ ...r, _key: Math.random().toString(36).slice(2) }))
}

function newRule(): EditableRule {
  return { _key: Math.random().toString(36).slice(2), protocol: 'PROTOCOL_TCP' }
}

function RuleTable({
  rules,
  setRules,
  ariaLabel,
}: {
  rules: EditableRule[]
  setRules: Dispatch<SetStateAction<EditableRule[]>>
  ariaLabel: string
}) {
  function updateField(key: string, field: keyof SecurityRule, value: string | number | undefined) {
    setRules((prev) => prev.map((r) => (r._key === key ? { ...r, [field]: value } : r)))
  }

  return (
    <>
      {rules.length > 0 && (
        <Table aria-label={ariaLabel} variant="compact" style={{ marginBottom: '0.5rem' }}>
          <Thead>
            <Tr>
              <Th>Protocol</Th>
              <Th>Port from</Th>
              <Th>Port to</Th>
              <Th>IPv4 CIDR</Th>
              <Th aria-label="Remove rule" />
            </Tr>
          </Thead>
          <Tbody>
            {rules.map((r) => (
              <Tr key={r._key}>
                <Td>
                  <FormSelect
                    value={r.protocol}
                    onChange={(_e, v) => updateField(r._key, 'protocol', v as Protocol)}
                    aria-label="Protocol"
                  >
                    {PROTOCOL_OPTIONS.map((opt) => (
                      <FormSelectOption key={opt.value} value={opt.value} label={opt.label} />
                    ))}
                  </FormSelect>
                </Td>
                <Td>
                  <TextInput
                    type="number"
                    value={r.portFrom ?? ''}
                    onChange={(_e, v) =>
                      updateField(r._key, 'portFrom', v.trim() ? Number(v) : undefined)
                    }
                    placeholder="1"
                    aria-label="Port from"
                  />
                </Td>
                <Td>
                  <TextInput
                    type="number"
                    value={r.portTo ?? ''}
                    onChange={(_e, v) =>
                      updateField(r._key, 'portTo', v.trim() ? Number(v) : undefined)
                    }
                    placeholder="65535"
                    aria-label="Port to"
                  />
                </Td>
                <Td>
                  <TextInput
                    value={r.ipv4Cidr ?? ''}
                    onChange={(_e, v) => updateField(r._key, 'ipv4Cidr', v.trim() || undefined)}
                    placeholder="0.0.0.0/0"
                    aria-label="IPv4 CIDR"
                  />
                </Td>
                <Td isActionCell>
                  <Button
                    variant="plain"
                    onClick={() => setRules((prev) => prev.filter((x) => x._key !== r._key))}
                    aria-label="Remove rule"
                  >
                    ✕
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
      <Button variant="link" onClick={() => setRules((prev) => [...prev, newRule()])}>
        + Add rule
      </Button>
    </>
  )
}

interface RulesEditorModalProps {
  sg: SecurityGroup
  onClose: () => void
}

export function RulesEditorModal({ sg, onClose }: RulesEditorModalProps) {
  const { mutateAsync: updateSg, isPending: saving } = useUpdateSecurityGroup()
  const [ingress, setIngress] = useState<EditableRule[]>(() => makeEditable(sg.spec.ingress))
  const [egress, setEgress] = useState<EditableRule[]>(() => makeEditable(sg.spec.egress))
  const [saveError, setSaveError] = useState<string | null>(null)
  const sgIdRef = useRef(sg.id)

  async function handleSave() {
    setSaveError(null)
    try {
      await updateSg({
        id: sgIdRef.current,
        ingress: ingress.map(({ _key: _k, ...r }) => r),
        egress: egress.map(({ _key: _k, ...r }) => r),
      })
      onClose()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Unknown error')
    }
  }

  return (
    <Modal isOpen onClose={onClose} variant="large" aria-labelledby="sg-rules-editor-title">
      <ModalHeader title={`Edit rules — ${sg.metadata.name}`} labelId="sg-rules-editor-title" />
      <ModalBody>
        {saveError && (
          <Alert variant="danger" title="Save failed" isInline className={modalAlertCss}>
            {saveError}
          </Alert>
        )}
        <ExpandableSection toggleText={`Ingress rules (${ingress.length})`} isExpanded>
          <RuleTable rules={ingress} setRules={setIngress} ariaLabel="Ingress rules" />
        </ExpandableSection>
        <ExpandableSection toggleText={`Egress rules (${egress.length})`} isExpanded>
          <RuleTable rules={egress} setRules={setEgress} ariaLabel="Egress rules" />
        </ExpandableSection>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={handleSave}
          isDisabled={saving}
          icon={saving ? <Spinner size="sm" aria-label="Saving" /> : undefined}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button variant="link" onClick={onClose} isDisabled={saving}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )
}
