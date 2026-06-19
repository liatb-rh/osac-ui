import { useState } from 'react'
import {
  ActionList,
  ActionListItem,
  Button,
  DataList,
  DataListCell,
  DataListContent,
  DataListItem,
  DataListItemCells,
  DataListItemRow,
  DataListToggle,
  Divider,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  NumberInput,
  Split,
  SplitItem,
  Switch,
  TextInput,
  Title,
} from '@patternfly/react-core'
import { AngleUpIcon } from '@patternfly/react-icons/dist/esm/icons/angle-up-icon'
import { AngleDownIcon } from '@patternfly/react-icons/dist/esm/icons/angle-down-icon'
import { TrashIcon } from '@patternfly/react-icons/dist/esm/icons/trash-icon'
import { PlusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon'
import type { FieldComponentType, FieldDefinition } from '../catalogitem/CatalogItem'

export interface FieldDefinitionBuilderProps {
  fields: FieldDefinition[]
  onChange: (fields: FieldDefinition[]) => void
}

const PALETTE: { type: FieldComponentType; label: string }[] = [
  { type: 'text', label: 'Text' },
  { type: 'number', label: 'Number' },
  { type: 'boolean', label: 'Boolean' },
  { type: 'select', label: 'Select' },
  { type: 'textarea', label: 'Textarea' },
  { type: 'password', label: 'Password' },
]

function makeField(componentType: FieldComponentType): FieldDefinition {
  return {
    id: crypto.randomUUID(),
    path: '',
    displayName: '',
    componentType,
    editable: true,
    defaultValue: componentType === 'boolean' ? false : componentType === 'number' ? 0 : '',
    options: componentType === 'select' ? [] : undefined,
    validation: {},
  }
}

function FieldRow({
  field,
  index,
  total,
  expanded,
  onToggleExpand,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  field: FieldDefinition
  index: number
  total: number
  expanded: boolean
  onToggleExpand: () => void
  onUpdate: (patch: Partial<FieldDefinition>) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const [newOption, setNewOption] = useState('')

  function addOption() {
    const trimmed = newOption.trim()
    if (!trimmed) return
    onUpdate({ options: [...(field.options ?? []), trimmed] })
    setNewOption('')
  }

  function removeOption(opt: string) {
    onUpdate({ options: (field.options ?? []).filter((o) => o !== opt) })
  }

  const rowId = `fdb-row-${field.id}`

  return (
    <DataListItem isExpanded={expanded} aria-labelledby={`${rowId}-label`}>
      <DataListItemRow>
        <DataListToggle
          id={`${rowId}-toggle`}
          aria-controls={`${rowId}-content`}
          isExpanded={expanded}
          onClick={onToggleExpand}
        />
        <DataListItemCells
          dataListCells={[
            <DataListCell key="path" width={2}>
              <FormGroup label="Path" fieldId={`${rowId}-path`}>
                <TextInput
                  id={`${rowId}-path`}
                  value={field.path}
                  onChange={(_, v) => onUpdate({ path: v })}
                  placeholder="e.g. spec.cores"
                  aria-label="Field path"
                />
              </FormGroup>
            </DataListCell>,
            <DataListCell key="name" width={2}>
              <FormGroup label="Display Name" fieldId={`${rowId}-name`}>
                <TextInput
                  id={`${rowId}-name`}
                  value={field.displayName}
                  onChange={(_, v) => onUpdate({ displayName: v })}
                  placeholder="e.g. CPU Cores"
                  aria-label="Display name"
                />
              </FormGroup>
            </DataListCell>,
            <DataListCell key="type" width={1}>
              <FormGroup label="Type" fieldId={`${rowId}-type`}>
                <TextInput
                  id={`${rowId}-type`}
                  value={field.componentType}
                  isDisabled
                  aria-label="Component type"
                />
              </FormGroup>
            </DataListCell>,
            <DataListCell key="editable" width={1}>
              <FormGroup label="Editable" fieldId={`${rowId}-editable`}>
                <Switch
                  id={`${rowId}-editable`}
                  isChecked={field.editable}
                  onChange={(_, v) => onUpdate({ editable: v })}
                  aria-label="Editable by user"
                />
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      {field.editable ? 'User can override' : 'Locked default'}
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>
            </DataListCell>,
            <DataListCell key="default" width={2}>
              <FormGroup label="Default Value" fieldId={`${rowId}-default`}>
                {field.componentType === 'number' ? (
                  <NumberInput
                    value={typeof field.defaultValue === 'number' ? field.defaultValue : 0}
                    min={field.validation?.min}
                    max={field.validation?.max}
                    onMinus={() =>
                      onUpdate({
                        defaultValue: Math.max(
                          field.validation?.min ?? -Infinity,
                          (typeof field.defaultValue === 'number' ? field.defaultValue : 0) - 1,
                        ),
                      })
                    }
                    onPlus={() =>
                      onUpdate({
                        defaultValue: Math.min(
                          field.validation?.max ?? Infinity,
                          (typeof field.defaultValue === 'number' ? field.defaultValue : 0) + 1,
                        ),
                      })
                    }
                    onChange={(e) =>
                      onUpdate({ defaultValue: Number((e.target as HTMLInputElement).value) })
                    }
                  />
                ) : field.componentType === 'boolean' ? (
                  <Switch
                    id={`${rowId}-default-bool`}
                    isChecked={!!field.defaultValue}
                    onChange={(_, v) => onUpdate({ defaultValue: v })}
                    aria-label="Default value"
                  />
                ) : (
                  <TextInput
                    id={`${rowId}-default`}
                    type={field.componentType === 'password' ? 'password' : 'text'}
                    value={typeof field.defaultValue === 'string' ? field.defaultValue : ''}
                    onChange={(_, v) => onUpdate({ defaultValue: v })}
                    aria-label="Default value"
                  />
                )}
              </FormGroup>
            </DataListCell>,
            <DataListCell key="actions" width={1} isFilled={false}>
              <ActionList style={{ marginTop: 24 }}>
                <ActionListItem>
                  <Button
                    variant="plain"
                    aria-label="Move up"
                    isDisabled={index === 0}
                    onClick={onMoveUp}
                  >
                    <AngleUpIcon />
                  </Button>
                </ActionListItem>
                <ActionListItem>
                  <Button
                    variant="plain"
                    aria-label="Move down"
                    isDisabled={index === total - 1}
                    onClick={onMoveDown}
                  >
                    <AngleDownIcon />
                  </Button>
                </ActionListItem>
                <ActionListItem>
                  <Button variant="plain" aria-label="Remove field" isDanger onClick={onRemove}>
                    <TrashIcon />
                  </Button>
                </ActionListItem>
              </ActionList>
            </DataListCell>,
          ]}
        />
      </DataListItemRow>

      <DataListContent
        id={`${rowId}-content`}
        aria-label={`${field.displayName || field.path} expanded details`}
        isHidden={!expanded}
      >
        <div style={{ padding: '16px 24px', display: 'grid', gap: 16 }}>
          {/* Number-specific validation */}
          {field.componentType === 'number' && (
            <Split hasGutter>
              <SplitItem>
                <FormGroup label="Min" fieldId={`${rowId}-min`}>
                  <NumberInput
                    value={field.validation?.min ?? 0}
                    onMinus={() =>
                      onUpdate({
                        validation: { ...field.validation, min: (field.validation?.min ?? 0) - 1 },
                      })
                    }
                    onPlus={() =>
                      onUpdate({
                        validation: { ...field.validation, min: (field.validation?.min ?? 0) + 1 },
                      })
                    }
                    onChange={(e) =>
                      onUpdate({
                        validation: {
                          ...field.validation,
                          min: Number((e.target as HTMLInputElement).value),
                        },
                      })
                    }
                  />
                </FormGroup>
              </SplitItem>
              <SplitItem>
                <FormGroup label="Max" fieldId={`${rowId}-max`}>
                  <NumberInput
                    value={field.validation?.max ?? 100}
                    onMinus={() =>
                      onUpdate({
                        validation: {
                          ...field.validation,
                          max: (field.validation?.max ?? 100) - 1,
                        },
                      })
                    }
                    onPlus={() =>
                      onUpdate({
                        validation: {
                          ...field.validation,
                          max: (field.validation?.max ?? 100) + 1,
                        },
                      })
                    }
                    onChange={(e) =>
                      onUpdate({
                        validation: {
                          ...field.validation,
                          max: Number((e.target as HTMLInputElement).value),
                        },
                      })
                    }
                  />
                </FormGroup>
              </SplitItem>
              <SplitItem>
                <FormGroup label="Step" fieldId={`${rowId}-step`}>
                  <NumberInput
                    value={field.validation?.step ?? 1}
                    min={1}
                    onMinus={() =>
                      onUpdate({
                        validation: {
                          ...field.validation,
                          step: Math.max(1, (field.validation?.step ?? 1) - 1),
                        },
                      })
                    }
                    onPlus={() =>
                      onUpdate({
                        validation: {
                          ...field.validation,
                          step: (field.validation?.step ?? 1) + 1,
                        },
                      })
                    }
                    onChange={(e) =>
                      onUpdate({
                        validation: {
                          ...field.validation,
                          step: Math.max(1, Number((e.target as HTMLInputElement).value)),
                        },
                      })
                    }
                  />
                </FormGroup>
              </SplitItem>
            </Split>
          )}

          {/* Text / textarea / password validation */}
          {(field.componentType === 'text' ||
            field.componentType === 'textarea' ||
            field.componentType === 'password') && (
            <Split hasGutter>
              <SplitItem>
                <FormGroup label="Min length" fieldId={`${rowId}-minlen`}>
                  <NumberInput
                    value={field.validation?.minLength ?? 0}
                    min={0}
                    onMinus={() =>
                      onUpdate({
                        validation: {
                          ...field.validation,
                          minLength: Math.max(0, (field.validation?.minLength ?? 0) - 1),
                        },
                      })
                    }
                    onPlus={() =>
                      onUpdate({
                        validation: {
                          ...field.validation,
                          minLength: (field.validation?.minLength ?? 0) + 1,
                        },
                      })
                    }
                    onChange={(e) =>
                      onUpdate({
                        validation: {
                          ...field.validation,
                          minLength: Math.max(0, Number((e.target as HTMLInputElement).value)),
                        },
                      })
                    }
                  />
                </FormGroup>
              </SplitItem>
              <SplitItem>
                <FormGroup label="Max length" fieldId={`${rowId}-maxlen`}>
                  <NumberInput
                    value={field.validation?.maxLength ?? 255}
                    min={1}
                    onMinus={() =>
                      onUpdate({
                        validation: {
                          ...field.validation,
                          maxLength: Math.max(1, (field.validation?.maxLength ?? 255) - 1),
                        },
                      })
                    }
                    onPlus={() =>
                      onUpdate({
                        validation: {
                          ...field.validation,
                          maxLength: (field.validation?.maxLength ?? 255) + 1,
                        },
                      })
                    }
                    onChange={(e) =>
                      onUpdate({
                        validation: {
                          ...field.validation,
                          maxLength: Math.max(1, Number((e.target as HTMLInputElement).value)),
                        },
                      })
                    }
                  />
                </FormGroup>
              </SplitItem>
              {field.componentType !== 'password' && (
                <SplitItem isFilled>
                  <FormGroup label="Pattern (regex)" fieldId={`${rowId}-pattern`}>
                    <TextInput
                      id={`${rowId}-pattern`}
                      value={field.validation?.pattern ?? ''}
                      onChange={(_, v) =>
                        onUpdate({ validation: { ...field.validation, pattern: v || undefined } })
                      }
                      placeholder="e.g. ^[a-z0-9-]+$"
                    />
                  </FormGroup>
                </SplitItem>
              )}
              {field.componentType === 'textarea' && (
                <SplitItem>
                  <FormGroup label="Rows" fieldId={`${rowId}-rows`}>
                    <NumberInput
                      value={field.validation?.rows ?? 3}
                      min={1}
                      max={20}
                      onMinus={() =>
                        onUpdate({
                          validation: {
                            ...field.validation,
                            rows: Math.max(1, (field.validation?.rows ?? 3) - 1),
                          },
                        })
                      }
                      onPlus={() =>
                        onUpdate({
                          validation: {
                            ...field.validation,
                            rows: Math.min(20, (field.validation?.rows ?? 3) + 1),
                          },
                        })
                      }
                      onChange={(e) =>
                        onUpdate({
                          validation: {
                            ...field.validation,
                            rows: Math.min(
                              20,
                              Math.max(1, Number((e.target as HTMLInputElement).value)),
                            ),
                          },
                        })
                      }
                    />
                  </FormGroup>
                </SplitItem>
              )}
            </Split>
          )}

          {/* Select options */}
          {field.componentType === 'select' && (
            <div>
              <Title headingLevel="h6" size="md" style={{ marginBottom: 8 }}>
                Options
              </Title>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {(field.options ?? []).map((opt) => (
                  <div
                    key={opt}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      background: 'var(--pf-t--global--background--color--secondary--default)',
                      borderRadius: 4,
                      padding: '2px 8px',
                    }}
                  >
                    <span>{opt}</span>
                    <Button
                      variant="plain"
                      isDanger
                      aria-label={`Remove option ${opt}`}
                      onClick={() => removeOption(opt)}
                      style={{ padding: '0 2px' }}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
              <Split hasGutter>
                <SplitItem isFilled>
                  <TextInput
                    value={newOption}
                    onChange={(_, v) => setNewOption(v)}
                    placeholder="Add option…"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addOption()
                      }
                    }}
                    aria-label="New option value"
                  />
                </SplitItem>
                <SplitItem>
                  <Button variant="secondary" onClick={addOption} icon={<PlusCircleIcon />}>
                    Add
                  </Button>
                </SplitItem>
              </Split>
            </div>
          )}
        </div>
      </DataListContent>
    </DataListItem>
  )
}

export function FieldDefinitionBuilder({ fields, onChange }: FieldDefinitionBuilderProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function addField(type: FieldComponentType) {
    const newField = makeField(type)
    onChange([...fields, newField])
    setExpandedIds((prev) => new Set([...prev, newField.id]))
  }

  function updateField(id: string, patch: Partial<FieldDefinition>) {
    onChange(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }

  function removeField(id: string) {
    onChange(fields.filter((f) => f.id !== id))
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  function moveField(index: number, direction: -1 | 1) {
    const next = [...fields]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div>
      {/* Component palette */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {PALETTE.map(({ type, label }) => (
          <Button
            key={type}
            variant="secondary"
            size="sm"
            icon={<PlusCircleIcon />}
            onClick={() => addField(type)}
          >
            {label}
          </Button>
        ))}
      </div>

      {fields.length === 0 ? (
        <div style={{ color: 'var(--pf-t--global--text--color--subtle)', padding: '16px 0' }}>
          No fields yet. Click a button above to add your first field.
        </div>
      ) : (
        <>
          <Divider style={{ marginBottom: 8 }} />
          <DataList aria-label="Field definitions">
            {fields.map((field, index) => (
              <FieldRow
                key={field.id}
                field={field}
                index={index}
                total={fields.length}
                expanded={expandedIds.has(field.id)}
                onToggleExpand={() => toggleExpand(field.id)}
                onUpdate={(patch) => updateField(field.id, patch)}
                onRemove={() => removeField(field.id)}
                onMoveUp={() => moveField(index, -1)}
                onMoveDown={() => moveField(index, 1)}
              />
            ))}
          </DataList>
        </>
      )}
    </div>
  )
}
