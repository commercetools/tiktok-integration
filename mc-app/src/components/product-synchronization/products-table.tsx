import { useEffect, useMemo, useState } from 'react';
import {
  DataTable,
  Pagination,
  Stack,
  type DataTableColumnItem,
} from '@commercetools/nimbus';

type Selection = {
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
};

type Props<T extends { id: string }> = {
  ariaLabel: string;
  columns: DataTableColumnItem<T>[];
  rows: T[];
  selection?: Selection;
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

/** A full-width table with Nimbus pagination; selection survives page changes. */
const ProductsTable = <T extends { id: string }>({
  ariaLabel,
  columns,
  rows,
  selection,
}: Props<T>) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  // A new check (or a smaller page count) must not leave an empty page showing.
  const lastPage = Math.max(1, Math.ceil(rows.length / pageSize));
  useEffect(() => {
    if (page > lastPage) {
      setPage(lastPage);
    }
  }, [page, lastPage]);

  const pageRows = useMemo(
    () => rows.slice((page - 1) * pageSize, page * pageSize),
    [rows, page, pageSize]
  );

  const handleSelectionChange = (keys: 'all' | Set<unknown>) => {
    if (!selection) {
      return;
    }
    const onPage = new Set(pageRows.map((row) => row.id));
    const chosen = keys === 'all' ? onPage : new Set([...keys].map(String));
    const next = new Set(
      [...selection.selectedIds].filter((id) => !onPage.has(id))
    );
    chosen.forEach((id) => next.add(id));
    selection.onSelectionChange(next);
  };

  return (
    <Stack direction="column" gap="300" width="100%">
      <DataTable
        aria-label={ariaLabel}
        density="condensed"
        allowsPinning={false}
        allowsExpandColumn={false}
        columns={columns}
        rows={pageRows}
        {...(selection && {
          selectionMode: 'multiple' as const,
          selectedKeys: selection.selectedIds,
          onSelectionChange: handleSelectionChange,
        })}
      />
      <Pagination
        aria-label={`${ariaLabel} pagination`}
        totalItems={rows.length}
        currentPage={page}
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        enablePageSizeSelector
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </Stack>
  );
};

ProductsTable.displayName = 'ProductsTable';

export default ProductsTable;
