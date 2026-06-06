import { css } from '@emotion/css'
import {
  Nav,
  NavGroup,
  NavItem,
  NavList,
  PageSidebar,
  PageSidebarBody,
  Stack,
  StackItem,
} from '@patternfly/react-core'
import { LightDarkToggle } from '@osac/ui-components'
import type { NavSection } from './shellNav'

const sidebarStackCss = css`
  min-height: 100%;
  width: 100%;
`

interface ShellSidebarProps {
  navRows: NavSection[]
  pathname: string
  onNavigate: (path: string) => void
  isDarkTheme: boolean
  setIsDarkTheme: (dark: boolean) => void
  onLogout: () => void
}

export function ShellSidebar({
  navRows,
  pathname,
  onNavigate,
  isDarkTheme,
  setIsDarkTheme,
  onLogout,
}: ShellSidebarProps) {
  return (
    <PageSidebar>
      <PageSidebarBody isFilled>
        <Stack className={sidebarStackCss}>
          <StackItem isFilled>
            <Nav aria-label="Primary navigation" className="osac-shell-nav">
              {navRows.map((section, idx) => {
                const list = (
                  <NavList>
                    {section.items.map((item) => {
                      const isActive =
                        pathname === item.path ||
                        (item.path !== '/' && pathname.startsWith(item.path + '/'))
                      const Icon = item.icon
                      return (
                        <NavItem
                          key={item.id}
                          itemId={item.id}
                          isActive={isActive}
                          to={item.path}
                          onClick={(e) => {
                            e.preventDefault()
                            onNavigate(item.path)
                          }}
                        >
                          <Icon aria-hidden className="osac-shell-nav__item-icon" />
                          {item.label}
                        </NavItem>
                      )
                    })}
                  </NavList>
                )

                if (section.groupLabel) {
                  return (
                    <NavGroup key={section.groupLabel} title={section.groupLabel}>
                      {list}
                    </NavGroup>
                  )
                }

                return <div key={`section-${idx}`}>{list}</div>
              })}
            </Nav>
          </StackItem>

          <StackItem className="osac-shell-sidebar-footer">
            <LightDarkToggle
              variant="shell"
              isDark={isDarkTheme}
              onChange={setIsDarkTheme}
              landingOnSelect={onLogout}
              landingAriaLabel="Back to welcome — choose institution and role"
              aria-label="Toggle theme"
            />
          </StackItem>
        </Stack>
      </PageSidebarBody>
    </PageSidebar>
  )
}
