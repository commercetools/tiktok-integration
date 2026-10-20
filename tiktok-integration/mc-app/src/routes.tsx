import type { ReactNode } from 'react';
import { Switch, Route, useRouteMatch } from 'react-router-dom';
import Spacings from '@commercetools-uikit/spacings';
import Welcome from './components/welcome';
import ConfigWizard from './components/config-wizard';
import MappersList from './components/mappers/mappers-list';
import AttributeMappersList from './components/mappers/attribute-mappers-list';
import AttributeMapperNew from './components/mappers/attribute-mapper-new';
import AttributeMapperDetails from './components/mappers/attribute-mapper-details';
import { ServiceUrlProvider, useServiceUrl } from './contexts';
import ProductSynchronization from './components/product-syncronization';

type ApplicationRoutesProps = {
  children?: ReactNode;
};

const RoutesContent = () => {
  const match = useRouteMatch();
  const { showConfigWizard } = useServiceUrl();

  /**
   * When using routes, there is a good chance that you might want to
   * restrict the access to a certain route based on the user permissions.
   * You can evaluate user permissions using the `useIsAuthorized` hook.
   * For more information see https://docs.commercetools.com/merchant-center-customizations/development/permissions
   *
   * NOTE that by default the Custom Application implicitly checks for a "View" permission,
   * otherwise it won't render. Therefore, checking for "View" permissions here
   * is redundant and not strictly necessary.
   */

  return (
    <Spacings.Inset scale="l">
      <Switch>
        <Route path={`${match.path}/mappers/attributes/new`} exact>
          <AttributeMapperNew />
        </Route>
        <Route path={`${match.path}/mappers/attributes/:productTypeId`} exact>
          <AttributeMapperDetails />
        </Route>
        <Route path={`${match.path}/mappers/attributes`} exact>
          <AttributeMappersList />
        </Route>
        <Route path={`${match.path}/mappers`} exact>
          <MappersList />
        </Route>
        <Route path={`${match.path}/product-synchronization`} exact>
          <ProductSynchronization />
        </Route>
        <Route>{showConfigWizard ? <ConfigWizard /> : <Welcome />}</Route>
      </Switch>
    </Spacings.Inset>
  );
};

const ApplicationRoutes = (_props: ApplicationRoutesProps) => {
  return (
    <ServiceUrlProvider>
      <RoutesContent />
    </ServiceUrlProvider>
  );
};
ApplicationRoutes.displayName = 'ApplicationRoutes';

export default ApplicationRoutes;
