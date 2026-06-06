import type { ReactNode } from 'react'
import { useState } from 'react'
import { css } from '@emotion/css'
import { Pagination } from '@patternfly/react-core'
import { Table, TableVariant, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const wrapCss = css`
  border: 1px solid var(--pf-t--global--border--color--default);
  border-radius: var(--pf-t--global--border--radius--medium);
  overflow: hidden;
  padding: 20px;
`

const paginationCss = css`
  border-top: 1px solid var(--pf-t--global--border--color--default);
`

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OcTableColumn<T> {
  /** Header label — pass `screenReaderText` only for action columns (no visible header) */
  label?: string
  screenReaderText?: string
  /** Render the cell content for a given row */
  render: (row: T) => ReactNode
  /** Forwarded to <Td dataLabel> for responsive breakpoints */
  dataLabel?: string
  /** Mark this column as an action cell (right-aligned, no wrap) */
  isActionCell?: boolean
}

export interface OcTableProps<T> {
  /** Accessible label for the table element */
  ariaLabel: string
  columns: OcTableColumn<T>[]
  rows: T[]
  /** Return a stable, unique key for each row */
  getRowKey: (row: T) => string
  /** If provided, rows become clickable */
  onRowClick?: (row: T) => void
  /** Rows where this returns true are not clickable (isClickable=false) */
  isRowDisabled?: (row: T) => boolean
  variant?: 'compact' | TableVariant
  /**
   * Enables pagination. When set, the table renders a PF Pagination bar
   * below the rows. Defaults to 10 rows per page.
   */
  defaultPageSize?: number
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OcTable<T>({
  ariaLabel,
  columns,
  rows,
  getRowKey,
  onRowClick,
  isRowDisabled,
  variant = 'compact' as const,
  defaultPageSize,
}: OcTableProps<T>) {
  const paginated = defaultPageSize != null

  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(defaultPageSize ?? 10)

  const visibleRows = paginated ? rows.slice((page - 1) * perPage, page * perPage) : rows

  return (
    <div className={wrapCss}>
      <Table aria-label={ariaLabel} variant={variant}>
        <Thead>
          <Tr>
            {columns.map((col, i) =>
              col.screenReaderText ? (
                <Th key={i} screenReaderText={col.screenReaderText} />
              ) : (
                <Th key={i}>{col.label}</Th>
              ),
            )}
          </Tr>
        </Thead>
        <Tbody>
          {visibleRows.map((row) => {
            const key = getRowKey(row)
            const disabled = isRowDisabled?.(row) ?? false
            const clickable = !disabled && !!onRowClick
            return (
              <Tr
                key={key}
                isClickable={clickable}
                onRowClick={clickable ? () => onRowClick(row) : undefined}
              >
                {columns.map((col, i) => (
                  <Td
                    key={i}
                    dataLabel={col.dataLabel ?? col.label}
                    isActionCell={col.isActionCell}
                    onClick={col.isActionCell ? (e) => e.stopPropagation() : undefined}
                  >
                    {col.render(row)}
                  </Td>
                ))}
              </Tr>
            )
          })}
        </Tbody>
      </Table>

      {paginated && (
        <Pagination
          className={paginationCss}
          itemCount={rows.length}
          page={page}
          perPage={perPage}
          onSetPage={(_e, p) => setPage(p)}
          onPerPageSelect={(_e, pp) => {
            setPerPage(pp)
            setPage(1)
          }}
          perPageOptions={[
            { title: '10', value: 10 },
            { title: '20', value: 20 },
            { title: '50', value: 50 },
          ]}
          isCompact
        />
      )}
    </div>
  )
}
