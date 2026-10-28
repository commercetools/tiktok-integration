import { CollapsibleMotion, Heading } from '@commercetools/nimbus';
import type { TEnrichedProduct } from '../../hooks/use-products';
import type { MappingConfig } from '../../hooks/use-tiktok-service';
import ExpandableText from './expandable-text';
import { productColumns } from './product-columns';
import ProductsTable from './products-table';

export type TUnimportableProduct = TEnrichedProduct & { error: string };

type Props = {
  products: TUnimportableProduct[];
  distributionChannelId?: string;
  supplyChannelId?: string;
  region?: string;
  mappings: MappingConfig;
};

/** Collapsed by default: these products need fixing, they are not the main task. */
const UnimportableProductsTable = ({ products, ...context }: Props) => (
  <CollapsibleMotion.Root defaultExpanded={false}>
    <CollapsibleMotion.Trigger>
      <Heading as="h3" size="sm">
        Unimportable Products ({products.length})
      </Heading>
    </CollapsibleMotion.Trigger>
    <CollapsibleMotion.Content>
      <ProductsTable
        ariaLabel="Unimportable products"
        columns={[
          ...productColumns<TUnimportableProduct>(context),
          {
            id: 'error',
            header: 'Reason',
            accessor: (row) => <ExpandableText>{row.error}</ExpandableText>,
          },
        ]}
        rows={products}
      />
    </CollapsibleMotion.Content>
  </CollapsibleMotion.Root>
);

UnimportableProductsTable.displayName = 'UnimportableProductsTable';

export default UnimportableProductsTable;
