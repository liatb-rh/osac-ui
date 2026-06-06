/**
 * flow: institutional-sign-in
 * step: auth_sign_in_form → auth_post_login_transition
 *
 * Renders InstitutionalSignInPage (spec sign_in_shell); tenant-specific visuals come from
 * branding_profiles via institutionalBrandingByTenant.
 */
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useSession } from '../../contexts/SessionContext'
import { InstitutionalSignInPage } from './InstitutionalSignInPage'
import { getFulfillmentCapabilities } from '../../api/client'
import { setAccessToken } from '../../api/authToken'

function isLikelyJwt(value: string): boolean {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)
}

export function SignInPage() {
  const { loginEmail, loginSuccess, logout } = useSession()
  const navigate = useNavigate()
  const [trustedIssuers, setTrustedIssuers] = useState<string[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    void getFulfillmentCapabilities()
      .then((capabilities) => {
        if (!mounted) return
        const issuers = capabilities.authn.trustedTokenIssuers.map((issuer) => issuer.issuerUrl)
        setTrustedIssuers(issuers)
      })
      .catch(() => {
        if (!mounted) return
        setTrustedIssuers([])
      })
    return () => {
      mounted = false
    }
  }, [])

  function handleChooseAnother() {
    logout()
    navigate('/')
  }

  function handleLogin(email: string, password: string) {
    setSubmitError(null)
    if (trustedIssuers.length > 0) {
      const token = password.trim()
      if (!isLikelyJwt(token)) {
        setSubmitError('Dev mode requires a JWT access token in the password field.')
        return
      }
      setAccessToken(token)
    }
    loginSuccess(email, password)
  }

  return (
    <InstitutionalSignInPage
      defaultEmail={loginEmail}
      onLoginSuccess={handleLogin}
      onChooseAnother={handleChooseAnother}
      trustedIssuers={trustedIssuers}
      submitError={submitError}
    />
  )
}
