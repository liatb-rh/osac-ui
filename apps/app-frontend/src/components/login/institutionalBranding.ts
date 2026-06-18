/**
 * Per-tenant branding for institutional sign-in (docs/specs/ui-flows/institutional-sign-in.yaml
 * branding_profiles + pre_login theme/document behavior reflected in layout).
 */
import type { DemoTenantId } from '@osac/api-contracts'
import type { CSSProperties } from 'react'

export type HeaderMarkSpec =
  | {
      kind: 'letter'
      letter: string
      boxGradient: string
      borderRadius: string
    }
  | { kind: 'emoji'; emoji: string }

export interface InstitutionalBranding {
  /** Matches spec branding_profiles[].id */
  profileId: string
  displayName: string
  tagline: string
  cardTitle: string
  emailLabel: string
  emailType: 'email' | 'text'
  showRememberMe: boolean
  pageBackground: string
  titleColor: string
  subtitleColor: string
  cardStyle: CSSProperties
  cardTitleStyle?: CSSProperties
  headerMark: HeaderMarkSpec
}

export const institutionalBrandingByTenant: Record<DemoTenantId, InstitutionalBranding> = {
  vertexa: {
    profileId: 'vertexa_provider',
    displayName: 'T-Mobile AI GRID',
    tagline: 'Provider platform portal',
    cardTitle: 'Sign in to your account',
    emailLabel: 'Work email',
    emailType: 'email',
    showRememberMe: false,
    pageBackground: 'linear-gradient(135deg, #0f1117 0%, #1a1f2e 100%)',
    titleColor: '#fff',
    subtitleColor: 'rgba(255,255,255,0.6)',
    cardStyle: { background: 'transparent', border: 'none', boxShadow: 'none' },
    cardTitleStyle: { color: '#fff' },
    headerMark: {
      kind: 'letter',
      letter: 'T',
      boxGradient: 'linear-gradient(135deg,rgb(243, 132, 174), #E41578)',
      borderRadius: '10px',
    },
  },
  northstar: {
    profileId: 'serve_robotics',
    displayName: 'Serve Robotics',
    tagline: 'Autonomous delivery, powered by the cloud.',
    cardTitle: 'Sign in to your account',
    emailLabel: 'Work email',
    emailType: 'email',
    showRememberMe: false,
    pageBackground: 'linear-gradient(160deg, #0F4233 0%, #1a6650 60%, #61E5C0 100%)',
    titleColor: '#CEE8E1',
    subtitleColor: 'rgba(206,232,225,0.75)',
    cardStyle: {
      background: 'rgba(255,255,255,0.07)',
      border: '1px solid rgba(97,229,192,0.25)',
      boxShadow: '0 8px 32px rgba(15,66,51,0.4)',
      backdropFilter: 'blur(12px)',
      borderRadius: '12px',
    },
    cardTitleStyle: { color: '#CEE8E1' },
    headerMark: {
      kind: 'letter',
      letter: 'S',
      boxGradient: 'linear-gradient(135deg, #61E5C0, #0F4233)',
      borderRadius: '10px',
    },
  },
  evergreen: {
    profileId: 'bluestone_financial',
    displayName: 'Bluestone Financial Group',
    tagline: 'Secure access to your financial workspace',
    cardTitle: 'Sign in',
    emailLabel: 'Email address',
    emailType: 'email',
    showRememberMe: false,
    pageBackground: 'linear-gradient(135deg, #f0f7ff 0%, #e8f0fe 100%)',
    titleColor: '#0d47a1',
    subtitleColor: '#546e7a',
    cardStyle: { background: 'transparent', border: 'none', boxShadow: 'none' },
    headerMark: {
      kind: 'letter',
      letter: 'B',
      boxGradient: 'linear-gradient(135deg, #1a73e8, #0d47a1)',
      borderRadius: '50%',
    },
  },
}
