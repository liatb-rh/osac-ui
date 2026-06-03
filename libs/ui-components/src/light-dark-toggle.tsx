import { MoonIcon } from '@patternfly/react-icons/dist/esm/icons/moon-icon'
import { SunIcon } from '@patternfly/react-icons/dist/esm/icons/sun-icon'
import { Button, Flex, FlexItem } from '@patternfly/react-core'

interface LightDarkToggleProps {
  isDark: boolean
  onChange: (isDark: boolean) => void
  'aria-label'?: string
  /** Shell variant shows a landing shortcut next to the toggle. */
  variant?: 'landing' | 'shell'
  landingOnSelect?: () => void
  landingAriaLabel?: string
}

export function LightDarkToggle({
  isDark,
  onChange,
  'aria-label': ariaLabel = 'Toggle theme',
  variant,
  landingOnSelect,
  landingAriaLabel,
}: LightDarkToggleProps) {
  return (
    <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsXs' }}>
      {variant === 'shell' && landingOnSelect && (
        <FlexItem>
          <Button
            variant="link"
            isInline
            onClick={landingOnSelect}
            aria-label={landingAriaLabel ?? 'Back to welcome'}
            style={{ fontSize: 'var(--pf-t--global--font--size--body--sm)' }}
          >
            ← Home
          </Button>
        </FlexItem>
      )}
      <FlexItem>
        <Button
          variant="plain"
          aria-label={ariaLabel}
          onClick={() => onChange(!isDark)}
          title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </Button>
      </FlexItem>
    </Flex>
  )
}
