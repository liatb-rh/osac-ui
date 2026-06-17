import { css, cx } from '@emotion/css'
import { BarsIcon } from '@patternfly/react-icons/dist/esm/icons/bars-icon'
import { BellIcon } from '@patternfly/react-icons/dist/esm/icons/bell-icon'
import { CogIcon } from '@patternfly/react-icons/dist/esm/icons/cog-icon'
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons/dist/esm/icons/outlined-question-circle-icon'
import { UserIcon } from '@patternfly/react-icons/dist/esm/icons/user-icon'
import {
  Button,
  Content,
  Dropdown,
  DropdownItem,
  DropdownList,
  Flex,
  Label,
  Masthead,
  MastheadBrand,
  MastheadContent,
  MastheadLogo,
  MastheadMain,
  MastheadToggle,
  MenuToggle,
  PageToggleButton,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core'
import type { MouseEvent } from 'react'
import type { DemoTenantId, OsacRole, TenantSovereignty } from '@osac/api-contracts'
import { demoOperatingModeLabel } from '@osac/api-contracts'
import serveRoboticsLogo from '../../assets/serve-robotics-logo.png'
import tmobileLogo from '../../assets/tmobile-logo.png'

const brandTitleCss = css`
  margin: 0;
  white-space: nowrap;
`

const contentRailCss = css`
  width: 100%;  
  min-width: 0;
  flex: 1;
`

const regionFlagCss = css`
  margin: 0;
  line-height: 1;
  display: inline-flex;
  align-items: center;
`

const regionLineCss = css`
  margin: 0;
  line-height: 1.2;
  display: inline-block;
`

interface ShellMastheadProps {
  selectedTenant: DemoTenantId | null
  role: OsacRole
  displayName: string
  sovereignty: TenantSovereignty | null
  isUserMenuOpen: boolean
  setIsUserMenuOpen: (open: boolean) => void
  onLogout: () => void
  onOpenActivities: () => void
}

export function ShellMasthead({
  selectedTenant,
  role,
  displayName,
  sovereignty,
  isUserMenuOpen,
  setIsUserMenuOpen,
  onLogout,
  onOpenActivities,
}: ShellMastheadProps) {
  return (
    <Masthead display={{ default: 'inline' }}>
      <MastheadMain>
        <MastheadToggle>
          <PageToggleButton variant="plain" aria-label="Global navigation">
            <BarsIcon />
          </PageToggleButton>
        </MastheadToggle>
        <MastheadLogo>
          <MastheadBrand>
            {role === 'providerAdmin' ? (
              <img src={tmobileLogo} alt="T-Mobile" style={{ width: '6rem' }} />
            ) : role === 'tenantAdmin' || role === 'tenantUser' ? (
              <img src={serveRoboticsLogo} alt="Serve Robotics" style={{ width: '6rem' }} />
            ) : (
              <Title headingLevel="h4" size="lg" className={brandTitleCss}>
                {selectedTenant === 'vertexa' ? '✦ T-Mobile AI' : '◆ Bluestone'}
              </Title>
            )}
          </MastheadBrand>
        </MastheadLogo>
      </MastheadMain>

      <MastheadContent className="osac-masthead-content">
        <Flex
          className={cx('osac-masthead-content-rail', contentRailCss)}
          direction={{ default: 'row' }}
          flexWrap={{ default: 'wrap' }}
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{
            default: sovereignty ? 'justifyContentSpaceBetween' : 'justifyContentFlexEnd',
          }}
          spaceItems={{ default: 'spaceItemsMd' }}
        >
          {sovereignty ? (
            <Flex
              className="osac-masthead-context-cluster osac-masthead-tenant-trust-strip"
              aria-label="Data residency and compliance"
              direction={{ default: 'column' }}
              flexWrap={{ default: 'wrap' }}
              alignItems={{ default: 'alignItemsCenter' }}
              spaceItems={{ default: 'spaceItemsMd' }}
            >
              <Flex
                className="osac-masthead-tenant-trust-strip__residency"
                spaceItems={{ default: 'spaceItemsXs' }}
              >
                <Content
                  component="small"
                  className={cx('osac-masthead-region-flag', regionFlagCss)}
                  role="img"
                  aria-label={sovereignty.regionAriaLabel}
                >
                  {sovereignty.regionEmoji}
                </Content>
                <Content
                  component="small"
                  className={cx('osac-masthead-region-line', regionLineCss)}
                  title={sovereignty.regionLine}
                >
                  {sovereignty.regionLine}
                </Content>
              </Flex>
              <Flex
                className="osac-masthead-tenant-trust-strip__compliance"
                spaceItems={{ default: 'spaceItemsXs' }}
              >
                {sovereignty.complianceLabels.map((tag) => (
                  <Label key={tag.text} color={tag.color} variant="outline" isCompact>
                    {tag.text}
                  </Label>
                ))}
              </Flex>
            </Flex>
          ) : null}
          <Flex
            direction={{ default: 'row' }}
            alignItems={{ default: 'alignItemsCenter' }}
            spaceItems={{ default: 'spaceItemsSm' }}
            flexWrap={{ default: 'nowrap' }}
          >
            <Toolbar>
              <ToolbarContent alignItems="center">
                <ToolbarGroup
                  align={{ default: 'alignEnd' }}
                  variant="action-group-plain"
                  gap={{ default: 'gapSm' }}
                >
                  <ToolbarItem>
                    <Button
                      variant="plain"
                      aria-label="Recent activities"
                      onClick={onOpenActivities}
                    >
                      <BellIcon />
                    </Button>
                  </ToolbarItem>
                  <ToolbarItem>
                    <Button variant="plain" aria-label="Help" onClick={(e) => e.preventDefault()}>
                      <OutlinedQuestionCircleIcon />
                    </Button>
                  </ToolbarItem>
                  <ToolbarItem>
                    <Button
                      variant="plain"
                      aria-label="Settings"
                      onClick={(e) => e.preventDefault()}
                    >
                      <CogIcon />
                    </Button>
                  </ToolbarItem>
                </ToolbarGroup>
              </ToolbarContent>
            </Toolbar>
            <Flex className="osac-masthead-user-cluster" spaceItems={{ default: 'spaceItemsSm' }}>
              <Dropdown
                isOpen={isUserMenuOpen}
                onSelect={() => setIsUserMenuOpen(false)}
                onOpenChange={setIsUserMenuOpen}
                popperProps={{ position: 'right' }}
                toggle={(ref) => (
                  <MenuToggle
                    ref={ref}
                    isExpanded={isUserMenuOpen}
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    icon={<UserIcon />}
                    aria-label="Account menu"
                  >
                    {displayName}
                    <Label
                      color="grey"
                      variant="outline"
                      isCompact
                      className="osac-masthead-operating-mode"
                    >
                      {demoOperatingModeLabel(role)}
                    </Label>
                  </MenuToggle>
                )}
              >
                <DropdownList>
                  <DropdownItem value="profile" onClick={(e: MouseEvent) => e.preventDefault()}>
                    Account settings
                  </DropdownItem>
                  <DropdownItem value="logout" onClick={onLogout}>
                    Log out
                  </DropdownItem>
                </DropdownList>
              </Dropdown>
            </Flex>
          </Flex>
        </Flex>
      </MastheadContent>
    </Masthead>
  )
}
