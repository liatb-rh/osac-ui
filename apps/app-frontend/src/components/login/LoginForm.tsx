import { EyeIcon } from '@patternfly/react-icons/dist/esm/icons/eye-icon'
import { EyeSlashIcon } from '@patternfly/react-icons/dist/esm/icons/eye-slash-icon'
/**
 * Shared login form — used by InstitutionalSignInPage (institutional-sign-in flow).
 */
import { css } from '@emotion/css'
import { useCallback, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Alert,
  Button,
  Checkbox,
  Form,
  FormGroup,
  InputGroup,
  InputGroupItem,
  Spinner,
  TextInput,
} from '@patternfly/react-core'

interface LoginFormProps {
  defaultEmail: string
  emailLabel?: string
  emailType?: 'email' | 'text'
  showRememberMe?: boolean
  isLoading: boolean
  onSubmit: (email: string, password: string) => void
  onChooseAnother: () => void
  trustedIssuers?: string[]
  submitError?: string | null
}

const forgotPasswordCss = css`
  margin-bottom: var(--pf-t--global--spacer--xs);
`

const chooseAnotherCss = css`
  margin-top: var(--pf-t--global--spacer--xs);
  text-align: center;
`

export function LoginForm({
  defaultEmail,
  emailLabel = 'Email address',
  emailType = 'email',
  showRememberMe = false,
  isLoading,
  onSubmit,
  onChooseAnother,
  trustedIssuers,
  submitError,
}: LoginFormProps) {
  const [email, setEmail] = useState(defaultEmail)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      if (isLoading) return
      onSubmit(email, password)
    },
    [email, password, isLoading, onSubmit],
  )

  return (
    <Form onSubmit={handleSubmit}>
      {trustedIssuers && trustedIssuers.length > 0 && (
        <Alert variant="info" isInline title="Trusted identity providers configured">
          Sign in with any of the configured trusted issuers for this environment.
        </Alert>
      )}
      {submitError ? <Alert variant="danger" isInline title={submitError} /> : null}

      <FormGroup label={emailLabel} fieldId="login-email" isRequired>
        <TextInput
          id="login-email"
          type={emailType}
          value={email}
          onChange={(_e, v) => setEmail(v)}
          isDisabled={isLoading}
          autoComplete="username"
          autoFocus
        />
      </FormGroup>

      <FormGroup label="Password" fieldId="login-password">
        <InputGroup>
          <InputGroupItem isFill>
            <TextInput
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(_e, v) => setPassword(v)}
              isDisabled={isLoading}
              autoComplete="current-password"
            />
          </InputGroupItem>
          <InputGroupItem>
            <Button
              variant="control"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((s) => !s)}
              isDisabled={isLoading}
            >
              {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
            </Button>
          </InputGroupItem>
        </InputGroup>
      </FormGroup>

      {showRememberMe && (
        <FormGroup fieldId="login-remember-me">
          <Checkbox
            id="login-remember-me"
            label="Remember me"
            isChecked={rememberMe}
            onChange={(_e, checked) => setRememberMe(checked)}
            isDisabled={isLoading}
          />
        </FormGroup>
      )}

      <Button
        variant="link"
        isInline
        onClick={(e) => e.preventDefault()}
        className={forgotPasswordCss}
      >
        Forgot password?
      </Button>

      <Button
        variant="primary"
        type="submit"
        isBlock
        isDisabled={isLoading}
        isLoading={isLoading}
        spinnerAriaLabel="Signing in"
      >
        {isLoading ? <Spinner size="md" aria-label="Signing in…" /> : 'Log in'}
      </Button>

      <Button
        variant="link"
        isInline
        onClick={onChooseAnother}
        isDisabled={isLoading}
        className={chooseAnotherCss}
      >
        Choose another institution
      </Button>
    </Form>
  )
}
