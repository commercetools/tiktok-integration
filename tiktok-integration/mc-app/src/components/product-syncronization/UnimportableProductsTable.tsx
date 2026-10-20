import { useMemo } from 'react';
import DataTable from '@commercetools-uikit/data-table';
import Text from '@commercetools-uikit/text';
import Spacings from '@commercetools-uikit/spacings';
import IconButton from '@commercetools-uikit/icon-button';
import { InformationIcon } from '@commercetools-uikit/icons';
import type { TEnrichedProduct } from '../../hooks/use-products';

type TUnimportableProduct = TEnrichedProduct & {
  error: string;
};

type TUnimportableProductsTableProps = {
  products: TUnimportableProduct[];
};

const UnimportableProductsTable = ({
  products,
}: TUnimportableProductsTableProps) => {
  const columns = useMemo(
    () => [
      {
        key: 'image',
        label: 'Image',
        renderItem: (row: TUnimportableProduct) => (
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
      {
        key: 'error',
        label: 'Error',
        renderItem: (row: TUnimportableProduct) => (
          <IconButton
            icon={<InformationIcon />}
            label="Error Information"
            size="small"
            onClick={() => {
              // The title attribute will show the error on hover
            }}
            title={row.error}
          />
        ),
        align: 'center' as const,
        disableResizing: true,
      },
    ],
    []
  );

  return (
    <Spacings.Stack scale="m">
      <Text.Headline as="h3">Unimportable Products ({products.length})</Text.Headline>
      {products.length === 0 ? (
        <Text.Body>No unimportable products found.</Text.Body>
      ) : (
        <DataTable columns={columns} rows={products} />
      )}
    </Spacings.Stack>
  );
};

export default UnimportableProductsTable;

