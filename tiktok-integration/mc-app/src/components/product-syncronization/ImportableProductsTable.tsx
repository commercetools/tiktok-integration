import { useMemo } from 'react';
import DataTable from '@commercetools-uikit/data-table';
import CheckboxInput from '@commercetools-uikit/checkbox-input';
import Text from '@commercetools-uikit/text';
import Spacings from '@commercetools-uikit/spacings';
import type { TEnrichedProduct } from '../../hooks/use-products';

type TImportableProductsTableProps = {
  products: TEnrichedProduct[];
  selectedProductIds: Record<string, boolean>;
  onSelectionChange: (productId: string, isSelected: boolean) => void;
};

const ImportableProductsTable = ({
  products,
  selectedProductIds,
  onSelectionChange,
}: TImportableProductsTableProps) => {
  const columns = useMemo(
    () => [
      {
        key: 'checkbox',
        label: '',
        shouldIgnoreRowClick: true,
        align: 'center' as const,
        renderItem: (row: TEnrichedProduct) => (
          <CheckboxInput
            isChecked={!!selectedProductIds[row.id]}
            onChange={() => {
              onSelectionChange(row.id, !selectedProductIds[row.id]);
            }}
          />
        ),
        disableResizing: true,
      },
      {
        key: 'image',
        label: 'Image',
        renderItem: (row: TEnrichedProduct) => (
          <div
            style={{
              width: '50px',
              height: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {row.imageUrl ? (
              <img
                src={row.imageUrl}
                alt={row.name}
                style={{
                  maxWidth: '50px',
                  maxHeight: '50px',
                  objectFit: 'contain',
                }}
              />
            ) : (
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  backgroundColor: '#e0e0e0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                }}
              >
                <Text.Detail tone="secondary">No Image</Text.Detail>
              </div>
            )}
          </div>
        ),
        disableResizing: true,
      },
      {
        key: 'name',
        label: 'Name',
        isSortable: true,
      },
      {
        key: 'sku',
        label: 'SKU',
        isSortable: true,
      },
    ],
    [selectedProductIds, onSelectionChange]
  );

  return (
    <Spacings.Stack scale="m">
      <Text.Headline as="h3">Importable Products ({products.length})</Text.Headline>
      {products.length === 0 ? (
        <Text.Body>No importable products found.</Text.Body>
      ) : (
        <DataTable columns={columns} rows={products} />
      )}
    </Spacings.Stack>
  );
};

export default ImportableProductsTable;

