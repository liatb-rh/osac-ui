import {
  EmptyState,
  EmptyStateBody,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  NumberInput,
  Switch,
  TextArea,
  TextInput,
  Title,
} from '@patternfly/react-core'
import { LockIcon } from '@patternfly/react-icons/dist/esm/icons/lock-icon'
import type { FieldDefinition } from '../catalogitem/CatalogItem'

export interface CatalogFormPreviewProps {
  fields: FieldDefinition[]
}

function LockedHelper() {
  return (
    <FormHelperText>
      <HelperText>
        <HelperTextItem icon={<LockIcon />}>
          Fixed — cannot be changed at provision time
        </HelperTextItem>
      </HelperText>
    </FormHelperText>
  )
}

function FieldPreview({ field }: { field: FieldDefinition }) {
  const { componentType, displayName, editable, defaultValue, options, validation } = field

  const helperText = !editable ? <LockedHelper /> : null

  let control: React.ReactNode

  switch (componentType) {
    case 'number':
      control = (
        <NumberInput
          value={typeof defaultValue === 'number' ? defaultValue : 0}
          min={validation?.min}
          max={validation?.max}
          isDisabled
        />
      )
      break
    case 'boolean':
      control = (
        <Switch
          id={`preview-${field.id}`}
          isChecked={!!defaultValue}
          isDisabled
          aria-label={displayName}
        />
      )
      break
    case 'textarea':
      control = (
        <TextArea
          id={`preview-${field.id}`}
          value={typeof defaultValue === 'string' ? defaultValue : ''}
          rows={validation?.rows ?? 3}
          isDisabled
          aria-label={displayName}
          resizeOrientation="vertical"
        />
      )
      break
    case 'select':
      control = (
        <TextInput
          id={`preview-${field.id}`}
          value={
            options?.length
              ? `Options: ${options.join(', ')}`
              : typeof defaultValue === 'string'
                ? defaultValue
                : ''
          }
          isDisabled
          aria-label={displayName}
        />
      )
      break
    case 'password':
      control = (
        <TextInput
          id={`preview-${field.id}`}
          type="password"
          value={typeof defaultValue === 'string' ? defaultValue : '••••••••'}
          isDisabled
          aria-label={displayName}
        />
      )
      break
    default:
      control = (
        <TextInput
          id={`preview-${field.id}`}
          value={typeof defaultValue === 'string' ? defaultValue : ''}
          isDisabled
          aria-label={displayName}
        />
      )
  }

  return (
    <FormGroup
      label={displayName || field.path || '(unnamed field)'}
      fieldId={`preview-${field.id}`}
      labelHelp={
        !editable ? (
          <LockIcon style={{ color: 'var(--pf-t--global--icon--color--subtle)' }} />
        ) : undefined
      }
    >
      {control}
      {helperText}
    </FormGroup>
  )
}

export function CatalogFormPreview({ fields }: CatalogFormPreviewProps) {
  if (fields.length === 0) {
    return (
      <EmptyState variant="xs">
        <Title headingLevel="h4" size="md">
          No fields defined
        </Title>
        <EmptyStateBody>
          Add fields using the palette above. They will appear here as a live preview.
        </EmptyStateBody>
      </EmptyState>
    )
  }

  return (
    <Form>
      {fields.map((field) => (
        <FieldPreview key={field.id} field={field} />
      ))}
    </Form>
  )
}
