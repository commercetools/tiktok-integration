import { useConnectorState } from '../../contexts';
import StoreConfigWizard from './store-config-wizard';
import ConnectProject from './connect-project';
import WarehouseConfigWizard from './warehouse-config-wizard';

/** The setup steps, in order: store, TikTok authorization, warehouse and channels. */
const ConfigWizard = () => {
  const { tiktokStore, connection } = useConnectorState();

  if (!tiktokStore) {
    return <StoreConfigWizard />;
  }

  if (!connection?.connected) {
    return <ConnectProject />;
  }

  return <WarehouseConfigWizard />;
};

ConfigWizard.displayName = 'ConfigWizard';

export default ConfigWizard;
