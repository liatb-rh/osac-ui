import { Breadcrumb, BreadcrumbItem, Button } from '@patternfly/react-core'
import type { OsacRole } from '@osac/api-contracts'

interface ShellBreadcrumbProps {
  isRecentActivities: boolean
  role: OsacRole
  onNavigate: (path: string) => void
}

export function ShellBreadcrumb({ isRecentActivities, role, onNavigate }: ShellBreadcrumbProps) {
  if (!isRecentActivities) return undefined

  return (
    <Breadcrumb>
      <BreadcrumbItem>
        <Button
          variant="link"
          isInline
          onClick={() => {
            onNavigate(role === 'providerAdmin' ? '/provider/dashboard' : '/dashboard')
          }}
        >
          Dashboard
        </Button>
      </BreadcrumbItem>
      <BreadcrumbItem isActive>Recent activities</BreadcrumbItem>
    </Breadcrumb>
  )
}
