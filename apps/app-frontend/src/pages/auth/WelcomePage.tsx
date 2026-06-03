import { CrownIcon } from '@patternfly/react-icons/dist/esm/icons/crown-icon'
import { UserIcon } from '@patternfly/react-icons/dist/esm/icons/user-icon'
import { UsersIcon } from '@patternfly/react-icons/dist/esm/icons/users-icon'
/**
 * flow: welcome-and-role-selection
 * step: wrs_welcome_landing
 */
import { type ReactNode, useLayoutEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Button, Content, Flex, FlexItem, Title } from '@patternfly/react-core'
import type { DemoShellRole, DemoTenantId } from '@osac/api-contracts'
import { DEMO_TENANT_LABEL } from '@osac/api-contracts'
import { LightDarkToggle } from '@osac/ui-components'
import { useSession } from '../../contexts/SessionContext'

const RH_LOGO_SRC = `${import.meta.env.BASE_URL}red-hat-logo.svg`

function RoleIconCircle({ children }: { children: ReactNode }) {
  return (
    <Flex
      alignItems={{ default: 'alignItemsCenter' }}
      justifyContent={{ default: 'justifyContentCenter' }}
      className="osac-welcome-role-icon"
      aria-hidden
    >
      {children}
    </Flex>
  )
}

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
    document.title = 'Red Hat OSAC Prototypes'
  }, [])

  useLayoutEffect(() => {
    if (!selectedTenant || isLoggedIn) return
    if (!consumeInitialOsacEntryDeepLinkRedirect()) return
    navigate('/sign-in')
  }, [selectedTenant, isLoggedIn, consumeInitialOsacEntryDeepLinkRedirect, navigate])

  function handleProviderAdmin() {
    selectProviderAdmin()
    navigate('/sign-in')
  }

  function handleTenantEntry(tenant: DemoTenantId, role: DemoShellRole) {
    selectTenantPersona(tenant, role)
    navigate('/sign-in')
  }

  return (
    // pf-primitive-exception: full-viewport welcome outside PF Page (#root scrollport)
    <div className="osac-welcome-page">
      {/* pf-primitive-exception: fixed theme toggle slot */}
      <div className="osac-welcome-page__toggle">
        <LightDarkToggle isDark={isDarkTheme} onChange={setIsDarkTheme} aria-label="Toggle theme" />
      </div>

      {/* pf-primitive-exception: welcome primary landmark */}
      <main className="osac-welcome-page__main">
        {/* pf-primitive-exception: centered content column */}
        <div className="osac-welcome-page__inner">
          <img
            src={RH_LOGO_SRC}
            alt=""
            width={96}
            height={96}
            className="osac-welcome-page__logo"
          />

          <Title headingLevel="h1" size="4xl" className="osac-welcome-page__title">
            Red Hat OSAC Prototypes
          </Title>

          <Content
            component="p"
            className="osac-welcome-page__lede"
            style={{ color: 'var(--pf-t--global--text--color--subtle)' }}
          >
            Choose a role, then pick an organization where applicable.
          </Content>

          <Alert
            variant="info"
            isInline
            title="Demo entry — not a customer sign-in page"
            className="osac-welcome-page__alert"
          >
            <Content component="p">
              This screen is for booth operators to pick a persona. In production, end users open
              their organization-branded URL and sign in through the identity provider configured
              during onboarding.
            </Content>
            <Content component="p" style={{ marginTop: 'var(--pf-t--global--spacer--xs)' }}>
              Each column simulates a separate persona path so you can show multi-tenant isolation
              in the VM workspace.
            </Content>
          </Alert>

          {/* pf-primitive-exception: three-column role layout */}
          <div className="osac-welcome-role-grid">
            {/* pf-primitive-exception: provider admin column */}
            <div className="osac-welcome-role-col" data-osac-welcome-role="providerAdmin">
              <RoleIconCircle>
                <CrownIcon />
              </RoleIconCircle>
              <Title headingLevel="h2" size="lg" className="osac-welcome-role-title">
                Provider Admin
              </Title>
              <Content
                component="p"
                className="osac-welcome-role-copy"
                style={{ color: 'var(--pf-t--global--text--color--subtle)' }}
              >
                Manage platform services, tenants, and global policies for the OSAC environment.
              </Content>
              <Flex
                justifyContent={{ default: 'justifyContentCenter' }}
                className="osac-welcome-role-actions"
              >
                <FlexItem>
                  <Button
                    variant="primary"
                    className="osac-welcome-role-btn"
                    onClick={handleProviderAdmin}
                  >
                    Enter
                  </Button>
                </FlexItem>
              </Flex>
            </div>

            {/* pf-primitive-exception: tenant admin column */}
            <div className="osac-welcome-role-col" data-osac-welcome-role="tenantAdmin">
              <RoleIconCircle>
                <UsersIcon />
              </RoleIconCircle>
              <Title headingLevel="h2" size="lg" className="osac-welcome-role-title">
                Tenant Admin
              </Title>
              <Content
                component="p"
                className="osac-welcome-role-copy"
                style={{ color: 'var(--pf-t--global--text--color--subtle)' }}
              >
                Configure organization resources, users, quotas, and shared services.
              </Content>
              <Flex
                direction={{ default: 'column' }}
                spaceItems={{ default: 'spaceItemsMd' }}
                className="osac-welcome-role-actions osac-welcome-role-actions--stack"
              >
                <FlexItem>
                  <Button
                    variant="primary"
                    className="osac-welcome-role-btn"
                    onClick={() => handleTenantEntry('northstar', 'tenantAdmin')}
                  >
                    {DEMO_TENANT_LABEL.northstar}
                  </Button>
                </FlexItem>
                <FlexItem>
                  <Button
                    variant="secondary"
                    className="osac-welcome-role-btn"
                    onClick={() => handleTenantEntry('evergreen', 'tenantAdmin')}
                  >
                    {DEMO_TENANT_LABEL.evergreen}
                  </Button>
                </FlexItem>
              </Flex>
            </div>

            {/* pf-primitive-exception: tenant user column */}
            <div className="osac-welcome-role-col" data-osac-welcome-role="tenantUser">
              <RoleIconCircle>
                <UserIcon />
              </RoleIconCircle>
              <Title headingLevel="h2" size="lg" className="osac-welcome-role-title">
                Tenant User
              </Title>
              <Content
                component="p"
                className="osac-welcome-role-copy"
                style={{ color: 'var(--pf-t--global--text--color--subtle)' }}
              >
                Access the VM-as-a-Service workspace to create and manage your virtual machines.
              </Content>
              <Flex
                direction={{ default: 'column' }}
                spaceItems={{ default: 'spaceItemsMd' }}
                className="osac-welcome-role-actions osac-welcome-role-actions--stack"
              >
                <FlexItem>
                  <Button
                    variant="primary"
                    className="osac-welcome-role-btn"
                    onClick={() => handleTenantEntry('northstar', 'tenantUser')}
                  >
                    {DEMO_TENANT_LABEL.northstar}
                  </Button>
                </FlexItem>
                <FlexItem>
                  <Button
                    variant="secondary"
                    className="osac-welcome-role-btn"
                    onClick={() => handleTenantEntry('evergreen', 'tenantUser')}
                  >
                    {DEMO_TENANT_LABEL.evergreen}
                  </Button>
                </FlexItem>
              </Flex>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
