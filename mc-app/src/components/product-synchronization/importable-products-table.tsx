import { Heading, Stack, Text } from '@commercetools/nimbus';
import type { TEnrichedProduct } from '../../hooks/use-products';
import type { MappingConfig } from '../../hooks/use-tiktok-service';
import { productColumns } from './product-columns';
import ProductsTable from './products-table';

type Props = {
  products: TEnrichedProduct[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  distributionChannelId?: string;
  supplyChannelId?: string;
  region?: string;
  mappings: MappingConfig;
};

const ImportableProductsTable = ({
  products,
  selectedIds,
  onSelectionChange,
  ...context
}: Props) => (
  <Stack direction="column" gap="300" width="100%">
    <Heading as="h3" size="md">
      Importable Products ({products.length})
    </Heading>
    {products.length === 0 ? (
      <Text color="neutral.11">No importable products found.</Text>
    ) : (
      <ProductsTable
        ariaLabel="Importable products"
        columns={productColumns(context)}
        rows={products}
        selection={{ selectedIds, onSelectionChange }}
      />
    )}
  </Stack>
);

ImportableProductsTable.displayName = 'ImportableProductsTable';

export default ImportableProductsTable;
