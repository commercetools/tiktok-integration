import { useHistory, useRouteMatch } from 'react-router-dom';
import Spacings from '@commercetools-uikit/spacings';
import Text from '@commercetools-uikit/text';
import PrimaryButton from '@commercetools-uikit/primary-button';
import Card from '@commercetools-uikit/card';
import FlatButton from '@commercetools-uikit/flat-button';
import { ListIcon } from '@commercetools-uikit/icons';

const MappersList = () => {
  const match = useRouteMatch();
  const history = useHistory();

  const handleBack = () => {
    history.push(match.url.replace('/mappers', ''));
  };

  const handleNavigateToAttributes = () => {
    history.push(`${match.url}/attributes`);
  };

  return (
    <Spacings.Stack scale="l">
      <FlatButton label="Back" onClick={handleBack} icon={<ListIcon />} />
      <Text.Headline as="h1">Product Mappers</Text.Headline>
      <Text.Body>
        Manage mappings between CommerceTools product types and TikTok
        categories and attributes.
      </Text.Body>

      <Spacings.Stack scale="m">
        <Card>
          <Spacings.Stack scale="m">
            <Text.Headline as="h3">Attribute Mappers</Text.Headline>
            <Text.Body>
              Map CommerceTools product types to TikTok categories and configure
              attribute mappings for product synchronization.
            </Text.Body>
            <div>
              <PrimaryButton
                label="Manage Attribute Mappers"
                onClick={handleNavigateToAttributes}
              />
            </div>
          </Spacings.Stack>
        </Card>
      </Spacings.Stack>
    </Spacings.Stack>
  );
};

export default MappersList;
