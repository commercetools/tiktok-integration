import React from 'react';
import { useServiceUrl } from '../../contexts';
import StoreConfigWizard from './store-config-wizard';
import WarehouseConfigWizard from './warehouse-config-wizard';
import ConnectProject from './connect-project';

const ConfigWizardWrapper = () => {
  const {
    mcTiktokStore,
    mcDistributionTiktokChannel,
    mcSupplyTiktokChannel,
    storedTiktokWarehouseId,
    configuration,
  } = useServiceUrl();

  if (
    !mcTiktokStore ||
    !mcDistributionTiktokChannel ||
    !mcSupplyTiktokChannel
  ) {
    return <StoreConfigWizard />;
  }

  if (!storedTiktokWarehouseId) {
    return <WarehouseConfigWizard />;
  }

  if (!configuration?.isInitialized) {
    return <ConnectProject />;
  }

  return <div>ConfigWizardWrapper</div>;
};

export default ConfigWizardWrapper;
