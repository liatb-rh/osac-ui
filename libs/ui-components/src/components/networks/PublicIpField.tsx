import { useState } from 'react'
import {
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  MenuToggle,
  Select,
  SelectList,
  SelectOption,
  Switch,
} from '@patternfly/react-core'
import type { PublicIP, PublicIPPool } from '@osac/api-contracts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PublicIpSelection {
  enabled: boolean
  /** "auto" | ip id */
  choice: string
  label: string
}

export interface PublicIpFieldProps {
  pools: PublicIPPool[]
  /** Pre-allocated IPs to offer as explicit choices */
  allocatedIPs?: PublicIP[]
  onChange?: (sel: PublicIpSelection) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PublicIpField({ pools, allocatedIPs = [], onChange }: PublicIpFieldProps) {
  const readyPools = pools.filter((p) => p.status.state === 'READY')
  const hasPool = readyPools.length > 0
  const poolLabel = readyPools.map((p) => p.metadata.name).join(', ')

  const [enabled, setEnabled] = useState(false)
  const [choice, setChoice] = useState('auto')
  const [selectOpen, setSelectOpen] = useState(false)

  function emitChange(nextEnabled: boolean, nextChoice: string) {
    if (!onChange) return
    let label = 'None'
    if (nextEnabled) {
      if (nextChoice === 'auto') {
        label = `Auto-allocate (${poolLabel || 'no pools available'})`
      } else {
        const ip = allocatedIPs.find((i) => i.id === nextChoice)
        label = ip?.status.address ?? nextChoice
      }
    }
    onChange({ enabled: nextEnabled, choice: nextChoice, label })
  }

  function handleSwitch(_: React.FormEvent<HTMLInputElement>, checked: boolean) {
    setEnabled(checked)
    emitChange(checked, choice)
  }

  function handleSelect(_: React.MouseEvent | undefined, value: string | number | undefined) {
    const v = String(value ?? 'auto')
    setChoice(v)
    setSelectOpen(false)
    emitChange(enabled, v)
  }

  const selectedLabel =
    choice === 'auto'
      ? 'Auto-allocate from an eligible pool'
      : (allocatedIPs.find((i) => i.id === choice)?.status.address ?? choice)

  return (
    <FormGroup label="Public IP">
      <Switch
        id="public-ip-enable"
        label="Assign a public IP"
        isChecked={enabled}
        onChange={handleSwitch}
        isDisabled={!hasPool}
      />
      {!hasPool && (
        <FormHelperText>
          <HelperText>
            <HelperTextItem variant="indeterminate">
              No public IP pool is available. Contact your tenant admin.
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      )}

      {enabled && hasPool && (
        <div style={{ marginTop: 8 }}>
          <FormGroup label="Public IP source" fieldId="public-ip-source">
            <Select
              isOpen={selectOpen}
              onOpenChange={setSelectOpen}
              toggle={(ref) => (
                <MenuToggle ref={ref} onClick={() => setSelectOpen((v) => !v)}>
                  {selectedLabel}
                </MenuToggle>
              )}
              selected={choice}
              onSelect={handleSelect}
            >
              <SelectList>
                <SelectOption
                  value="auto"
                  description={poolLabel ? `Pools: ${poolLabel}` : undefined}
                >
                  Auto-allocate from an eligible pool
                </SelectOption>
                {allocatedIPs.map((ip) => (
                  <SelectOption key={ip.id} value={ip.id} description={`Pool: ${ip.spec.pool}`}>
                    {ip.status.address ?? ip.id}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  The IP is attached automatically once the workload reaches Running.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
        </div>
      )}
    </FormGroup>
  )
}
