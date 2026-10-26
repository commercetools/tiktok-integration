import { useMemo } from 'react';
import { useHistory, useRouteMatch } from 'react-router-dom';
import { Button, DataTable, LoadingSpinner, Text } from '@commercetools/nimbus';
import { Add } from '@commercetools/nimbus-icons';
import { useMappings } from '../../hooks/use-mappings';
import { useProductTypesFetcher } from '../../hooks/use-product-types';
import ErrorAlert from '../ui/error-alert';
import Page from '../ui/page';

type Row = { id: string; name: string; key: string; categoryId: string };

const columns = [
  { id: 'name', header: 'Product Type Name', accessor: (row: Row) => row.name },
  { id: 'key', header: 'Key', accessor: (row: Row) => row.key },
  {
    id: 'categoryId',
    header: 'TikTok Category ID',
    accessor: (row: Row) => row.categoryId,
  },
];

const MappersList = () => {
  const match = useRouteMatch();
  const history = useHistory();
  const { mappings, loading: mappingsLoading, error } = useMappings();
  const { productTypes, loading: productTypesLoading } =
    useProductTypesFetcher();

  const rows = useMemo<Row[]>(
    () =>
      (productTypes ?? [])
        .filter((productType) => mappings.productTypes[productType.id])
        .map((productType) => ({
          id: productType.id,
          name: productType.name,
          key: productType.key,
          categoryId: mappings.productTypes[productType.id]?.categoryId ?? '',
        })),
    [productTypes, mappings]
  );

  return (
    <Page
      title="Product Mappers"
      description="Product types mapped to TikTok categories. Select a row to edit the mapping of its attributes."
      onBack={() => history.push(match.url.replace('/mappers', ''))}
      actions={
        <Button
          variant="solid"
          colorPalette="primary"
          onPress={() => history.push(`${match.url}/new`)}
        >
          <Add />
          Add New Mapper
        </Button>
      }
    >
      {error && (
        <ErrorAlert title="The mappers could not be loaded" error={error} />
      )}
      {mappingsLoading || productTypesLoading ? (
        <LoadingSpinner />
      ) : rows.length === 0 ? (
        <Text color="neutral.11">
          No mappers configured yet. Choose &quot;Add New Mapper&quot; to get
          started.
        </Text>
      ) : (
        <DataTable
          aria-label="Mapped product types"
          columns={columns}
          rows={rows}
          onRowAction={(row) => history.push(`${match.url}/${row.id}`)}
        />
      )}
    </Page>
  );
};

MappersList.displayName = 'MappersList';

export default MappersList;
