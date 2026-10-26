import { useState } from 'react';
import { useHistory, useRouteMatch } from 'react-router-dom';
import { Button, LoadingSpinner, Stack, Text } from '@commercetools/nimbus';
import { useShowNotification } from '@commercetools-frontend/actions-global';
import {
  DOMAINS,
  NOTIFICATION_KINDS_SIDE,
} from '@commercetools-frontend/constants';
import { useConnectorState } from '../../contexts';
import { useMappings } from '../../hooks/use-mappings';
import { useProductSync } from '../../hooks/use-product-sync';
import {
  useProductsByIds,
  type TEnrichedProduct,
} from '../../hooks/use-products';
import Page from '../ui/page';
import ImportableProductsTable from './importable-products-table';
import UnimportableProductsTable, {
  type TUnimportableProduct,
} from './unimportable-products-table';

const ProductSynchronization = () => {
  const match = useRouteMatch();
  const history = useHistory();
  const showNotification = useShowNotification();
  const sync = useProductSync();
  const { getProductsByIds, loading: productsLoading } = useProductsByIds();
  const { distributionChannel, supplyChannel, connection } =
    useConnectorState();
  const { mappings } = useMappings();
  const tableContext = {
    distributionChannelId: distributionChannel?.id,
    supplyChannelId: supplyChannel?.id,
    region: connection?.shop?.region,
    mappings,
  };

  const [importable, setImportable] = useState<TEnrichedProduct[]>([]);
  const [unimportable, setUnimportable] = useState<TUnimportableProduct[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hasChecked, setHasChecked] = useState(false);

  const notify = (kind: 'success' | 'error' | 'warning', text: string) =>
    showNotification({
      kind: NOTIFICATION_KINDS_SIDE[kind],
      domain: DOMAINS.SIDE,
      text,
    });

  const handleCheck = async () => {
    setHasChecked(false);
    setSelectedIds(new Set());
    try {
      const result = await sync.fullProductCheck();
      const channelIds = supplyChannel ? [supplyChannel.id] : [];
      setImportable(
        await getProductsByIds(result.importableProducts, channelIds)
      );
      const enriched = await getProductsByIds(
        result.unimportableProducts.map((p) => p.id),
        channelIds
      );
      setUnimportable(
        enriched.map((product) => ({
          ...product,
          error:
            result.unimportableProducts.find((p) => p.id === product.id)
              ?.error ?? 'Unknown error',
        }))
      );
      setHasChecked(true);
      notify(
        'success',
        `Product check completed. Found ${result.importableProducts.length} importable and ${result.unimportableProducts.length} unimportable products.`
      );
    } catch (error) {
      notify('error', (error as Error).message);
    }
  };

  const handleImportSelected = async () => {
    try {
      const { message } = await sync.selectiveProductSync([...selectedIds]);
      notify('success', message);
      setSelectedIds(new Set());
    } catch (error) {
      notify('error', `Failed to import products: ${(error as Error).message}`);
    }
  };

  const handleSyncAll = async () => {
    try {
      const { message } = await sync.fullProductSync();
      notify('success', message);
    } catch (error) {
      notify('error', `Failed to sync products: ${(error as Error).message}`);
    }
  };

  const busy = sync.busy || productsLoading;

  return (
    <Page
      title="Product Synchronization"
      description="Check which products can be imported to TikTok and sync them selectively, or sync every product."
      onBack={() =>
        history.push(match.url.replace('/product-synchronization', ''))
      }
    >
      <Stack direction="row" gap="200">
        <Button
          variant="solid"
          colorPalette="primary"
          onPress={() => void handleCheck()}
          isDisabled={busy}
        >
          Check Products
        </Button>
        <Button
          variant="outline"
          colorPalette="primary"
          onPress={() => void handleSyncAll()}
          isDisabled={busy}
        >
          Sync all products
        </Button>
      </Stack>

      {busy && <LoadingSpinner />}

      {!hasChecked && !busy && (
        <Text color="neutral.11">
          Press <strong>Check Products</strong> to see which products can be
          imported to TikTok and why the others cannot.
        </Text>
      )}

      {hasChecked && !busy && (
        <Stack direction="column" gap="400" width="100%">
          <ImportableProductsTable
            products={importable}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            {...tableContext}
          />
          {importable.length > 0 && (
            <div>
              <Button
                variant="solid"
                colorPalette="primary"
                onPress={() => void handleImportSelected()}
                isDisabled={selectedIds.size === 0}
              >
                Import to TikTok ({selectedIds.size} selected)
              </Button>
            </div>
          )}
          {unimportable.length > 0 && (
            <UnimportableProductsTable
              products={unimportable}
              {...tableContext}
            />
          )}
        </Stack>
      )}
    </Page>
  );
};

ProductSynchronization.displayName = 'ProductSynchronization';

export default ProductSynchronization;
