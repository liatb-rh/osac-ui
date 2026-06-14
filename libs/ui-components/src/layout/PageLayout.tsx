import type { ReactNode } from 'react'
import { PageSection, Spinner } from '@patternfly/react-core'
import { PageHeader } from '../headers/PageHeader'

export interface PageLayoutProps {
  title: ReactNode
  description?: ReactNode
  /** Buttons / controls rendered in the top-right area of the header. */
  actions?: ReactNode
  /** Show a centred spinner and suppress children while true. */
  isLoading?: boolean
  /** Accessible label for the spinner (defaults to "Loading"). */
  loadingLabel?: string
  /** Render an inline error message when truthy. Pass the error string or `true` for a generic message. */
  error?: string | boolean | null
  children?: ReactNode
}

/**
 * Standard full-page layout: `<PageSection isFilled>` wrapping a `<PageHeader>` and
 * optional loading / error states above the page body.
 *
 * Eliminates the boilerplate that every list/detail page otherwise repeats verbatim.
 */
export function PageLayout({
  title,
  description,
  actions,
  isLoading,
  loadingLabel = 'Loading',
  error,
  children,
}: PageLayoutProps) {
  return (
    <PageSection isFilled>
      <PageHeader title={title} description={description} actions={actions} />
      {isLoading && <Spinner aria-label={loadingLabel} style={{ marginTop: 16 }} />}
      {!isLoading && error && (
        <p style={{ color: 'var(--pf-v5-global--danger-color--100)', marginTop: 8 }}>
          {typeof error === 'string' ? error : 'An error occurred. Please try again.'}
        </p>
      )}
      {!isLoading && children}
    </PageSection>
  )
}
