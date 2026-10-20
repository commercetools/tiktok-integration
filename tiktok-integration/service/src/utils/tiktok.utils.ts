import { CommercetoolsClient, CommercetoolsStorage, Utils } from '../shared';

export const getAccessToken = async () => {
  const apiRoot = CommercetoolsClient.createApiRoot(Utils.readConfiguration());
  const access_token =
    await CommercetoolsStorage.TokenController.getAccessToken(apiRoot);

  return access_token;
};
