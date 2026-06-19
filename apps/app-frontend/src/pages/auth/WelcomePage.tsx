/**
 * flow: welcome-and-role-selection
 * step: wrs_welcome_landing
 */
import { type ReactNode, useLayoutEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Content, Flex, FlexItem, Stack, StackItem, Title } from '@patternfly/react-core'
import { CloudIcon } from '@patternfly/react-icons/dist/esm/icons/cloud-icon'
import type { DemoTenantId, OsacRole } from '@osac/api-contracts'
import { CardActive, type CardActiveTone, LightDarkToggle } from '@osac/ui-components'
import { useSession } from '../../contexts/SessionContext'
import serveRoboticsLogo from '../../assets/serve-robotics-logo.png'
import tmobileLogo from '../../assets/tmobile-logo.png'

// ---------------------------------------------------------------------------
// Persona definitions
// ---------------------------------------------------------------------------

interface Persona {
  id: string
  badge: string
  orgName: string
  roleLabel: string
  tone: CardActiveTone
  accentColor: string
  desc: string
  iconNode: ReactNode
  onSelect: () => void
}

// ---------------------------------------------------------------------------
// WelcomePage
// ---------------------------------------------------------------------------

export function WelcomePage() {
  const navigate = useNavigate()
  const {
    selectProviderAdmin,
    selectTenantPersona,
    isDarkTheme,
    setIsDarkTheme,
    selectedTenant,
    isLoggedIn,
    consumeInitialOsacEntryDeepLinkRedirect,
  } = useSession()

  useLayoutEffect(() => {
    document.title = 'OSAC Prototypes'
  }, [])

  // Honor deep-link ?osac-entry= — skip this screen when already resolved
  useLayoutEffect(() => {
    if (!selectedTenant || isLoggedIn) return
    if (!consumeInitialOsacEntryDeepLinkRedirect()) return
    navigate('/sign-in')
  }, [selectedTenant, isLoggedIn, consumeInitialOsacEntryDeepLinkRedirect, navigate])

  function go(select: () => void) {
    select()
    navigate('/sign-in')
  }

  function tenantEntry(tenant: DemoTenantId, role: OsacRole) {
    return () => go(() => selectTenantPersona(tenant, role))
  }

  const personas: Persona[] = [
    {
      id: 'provider-admin',
      badge: 'Platform Operator',
      orgName: 'T-Mobile AI GRID',
      roleLabel: 'Provider Admin',
      tone: 'provider',
      accentColor: '#E41578',
      desc: 'Govern sovereign infrastructure, tenant organizations, storage tiers and global templates.',
      iconNode: (
        <img src={tmobileLogo} alt="T-Mobile" style={{ height: '2rem', objectFit: 'contain' }} />
      ),
      onSelect: () => go(selectProviderAdmin),
    },
    {
      id: 'northstar-admin',
      badge: 'Tenant Organization',
      orgName: 'Serve Robotics',
      roleLabel: 'Admin',
      tone: 'northstar',
      accentColor: '#1e7e34',
      desc: 'Administer users, quota, networks, and cluster offerings for a regulated institution.',
      iconNode: (
        <img
          src={serveRoboticsLogo}
          alt="Serve Robotics"
          style={{ height: '2rem', objectFit: 'contain' }}
        />
      ),
      onSelect: tenantEntry('northstar', 'tenantAdmin'),
    },
    {
      id: 'northstar-user',
      badge: 'Tenant Organization',
      orgName: 'Serve Robotics',
      roleLabel: 'User',
      tone: 'northstar',
      accentColor: '#003f87',
      desc: 'Provision VMs, manage workloads and provision OpenShift clusters as a workspace operator.',
      iconNode: (
        <img
          src={serveRoboticsLogo}
          alt="Serve Robotics"
          style={{ height: '2rem', objectFit: 'contain' }}
        />
      ),
      onSelect: tenantEntry('northstar', 'tenantUser'),
    },
    // {
    //   id: 'bluestone-admin',
    //   badge: 'Tenant Organization',
    //   orgName: 'Bluestone Financial Group',
    //   roleLabel: 'Tenant Admin',
    //   tone: 'bluestone',
    //   accentColor: '#1f7a4d',
    //   desc: 'Administer users, quota, networks, and cluster offerings for Bluestone teams.',
    //   Icon: BuildingIcon,
    //   onSelect: tenantEntry('evergreen', 'tenantAdmin'),
    // },
    // {
    //   id: 'bluestone-user',
    //   badge: 'Tenant Organization',
    //   orgName: 'Bluestone Financial Group',
    //   roleLabel: 'Tenant User',
    //   tone: 'bluestone',
    //   accentColor: '#1f7a4d',
    //   desc: 'Operate the VM and cluster lifecycle inside the Bluestone workspace.',
    //   Icon: UserIcon,
    //   onSelect: tenantEntry('evergreen', 'tenantUser'),
    // },
  ]

  return (
    // pf-primitive-exception: full-viewport welcome outside PF Page (#root scrollport)
    <div className="osac-welcome-page osac-welcome-page--personas">
      {/* pf-primitive-exception: fixed theme toggle slot */}
      <div className="osac-welcome-page__toggle">
        <LightDarkToggle isDark={isDarkTheme} onChange={setIsDarkTheme} aria-label="Toggle theme" />
      </div>

      {/* pf-primitive-exception: welcome primary landmark */}
      <main className="osac-welcome-page__main">
        <div className="osac-welcome-page__inner osac-welcome-page__inner--personas">
          {/* Brand header */}
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            spaceItems={{ default: 'spaceItemsSm' }}
            className="osac-welcome-brand"
          >
            <FlexItem>
              <div className="osac-welcome-brand__icon" aria-hidden>
                <CloudIcon />
              </div>
            </FlexItem>
            <FlexItem>
              <Content component="p" className="osac-welcome-brand__name">
                OSAC
              </Content>
              <Content component="small" className="osac-welcome-brand__sub">
                Open Sovereign AI Cloud
              </Content>
            </FlexItem>
          </Flex>

          {/* Hero text */}
          <Stack className="osac-welcome-hero">
            <StackItem>
              <span className="osac-welcome-eyebrow" aria-hidden>
                OSAC Console
              </span>
            </StackItem>
            <StackItem>
              <Title headingLevel="h1" size="4xl" className="osac-welcome-hero-title">
                Choose how you want to enter the cloud.
              </Title>
            </StackItem>
            <StackItem>
              <Content component="p" className="osac-welcome-hero-sub">
                Every persona below applies a tenant and role, then routes through institutional
                sign-in. Permissions, navigation, and capabilities are derived from the canonical
                OSAC role-based access matrix.
              </Content>
            </StackItem>
          </Stack>

          {/* Persona grid */}
          <div className="osac-persona-grid" role="list" aria-label="Select a persona">
            {personas.map((p) => (
              <CardActive
                key={p.id}
                tone={p.tone}
                badge={p.badge}
                icon={p.iconNode}
                title={p.orgName}
                subtitle={p.roleLabel}
                description={p.desc}
                cta="Continue to sign-in →"
                onClick={p.onSelect}
              />
            ))}
          </div>

          <footer className="osac-welcome-footer">
            Mock demo environment · OSAC_API_MODE=mock · No real institutional credentials are used.
          </footer>
        </div>
      </main>
    </div>
  )
}
