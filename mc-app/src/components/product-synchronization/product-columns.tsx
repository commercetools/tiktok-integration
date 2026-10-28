import type { DataTableColumnItem } from '@commercetools/nimbus';
import type { TEnrichedProduct } from '../../hooks/use-products';
import type { MappingConfig } from '../../hooks/use-tiktok-service';
import ExpandableText from './expandable-text';
import {
  describeInventory,
  describeMappings,
  describePrice,
} from './product-offer';
import ProductImage from './product-cell';

type ColumnContext = {
  distributionChannelId?: string;
  supplyChannelId?: string;
  region?: string;
  mappings: MappingConfig;
};

/** The columns both tables share: product, price and inventory on the TikTok channels, and the attribute mappings. */
export const productColumns = <T extends TEnrichedProduct>(
  context: ColumnContext
): DataTableColumnItem<T>[] => [
  {
    id: 'image',
    header: 'Image',
    width: 64,
    accessor: (row) => <ProductImage product={row} />,
  },
  {
    id: 'name',
    header: 'Name',
    accessor: (row) => row.name,
    isRowHeader: true,
  },
  { id: 'sku', header: 'SKU', accessor: (row) => row.sku, width: 160 },
  {
    id: 'price',
    header: 'Price',
    width: 150,
    accessor: (row) => describePrice(row, context),
  },
  {
    id: 'inventory',
    header: 'Inventory',
    width: 120,
    accessor: (row) => describeInventory(row, context),
  },
  {
    id: 'mappings',
    header: 'Mapped attributes',
    accessor: (row) => {
      const mappings = describeMappings(row, context.mappings);
      return mappings.length === 0 ? (
        'Not mapped'
      ) : (
        <ExpandableText>{mappings.join(', ')}</ExpandableText>
      );
    },
  },
];
