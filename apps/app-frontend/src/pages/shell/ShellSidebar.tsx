import { css } from '@emotion/css'
import {
  Nav,
  NavExpandable,
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
                      const Icon = item.icon

                      if (item.children && item.children.length > 0) {
                        const isExpanded = item.children.some((c) => {
                          if (pathname === c.path) return true
                          if (c.exactMatch) return false
                          return c.path !== '/' && pathname.startsWith(c.path + '/')
                        })
                        return (
                          <NavExpandable
                            key={item.id}
                            title={
                              <>
                                <Icon aria-hidden className="osac-shell-nav__item-icon" />
                                {item.label}
                              </>
                            }
                            groupId={item.id}
                            isActive={isExpanded}
                            isExpanded={isExpanded}
                          >
                            {item.children.map((child) => {
                              const ChildIcon = child.icon
                              const isActive =
                                pathname === child.path ||
                                (!child.exactMatch &&
                                  child.path !== '/' &&
                                  pathname.startsWith(child.path + '/'))
                              return (
                                <NavItem
                                  key={child.id}
                                  itemId={child.id}
                                  isActive={isActive}
                                  to={child.path}
                                  onClick={(e) => {
                                    e.preventDefault()
                                    onNavigate(child.path)
                                  }}
                                >
                                  <ChildIcon aria-hidden className="osac-shell-nav__item-icon" />
                                  {child.label}
                                </NavItem>
                              )
                            })}
                          </NavExpandable>
                        )
                      }

                      const isActive =
                        pathname === item.path ||
                        (item.path !== '/' && pathname.startsWith(item.path + '/'))
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
