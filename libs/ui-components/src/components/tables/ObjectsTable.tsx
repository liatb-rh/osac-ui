import type { ReactNode } from 'react'
import { useState } from 'react'
import { Pagination } from '@patternfly/react-core'
import { Table, TableVariant, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import styles from './ObjectsTable.module.css'

export interface ObjectsTableColumn<T> {
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

export interface ObjectsTableProps<T> {
  /** Accessible label for the table element */
  ariaLabel: string
  columns: ObjectsTableColumn<T>[]
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

export function ObjectsTable<T>({
  ariaLabel,
  columns,
  rows,
  getRowKey,
  onRowClick,
  isRowDisabled,
  variant = 'compact',
  defaultPageSize,
}: ObjectsTableProps<T>) {
  const paginated = defaultPageSize != null

  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(defaultPageSize ?? 10)

  const visibleRows = paginated ? rows.slice((page - 1) * perPage, page * perPage) : rows

  return (
    <div className={styles.wrap}>
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
          className={styles.pagination}
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
