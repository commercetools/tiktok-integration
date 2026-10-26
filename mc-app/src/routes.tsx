import { useMemo, type ReactNode } from 'react';
import { Route, Switch, useHistory, useRouteMatch } from 'react-router-dom';
import { LoadingSpinner, NimbusProvider, Stack } from '@commercetools/nimbus';
import { useApplicationContext } from '@commercetools-frontend/application-shell-connectors';
import Welcome from './components/welcome';
import ConfigWizard from './components/config-wizard';
import MappersList from './components/mappers/mappers-list';
import MapperNew from './components/mappers/mapper-new';
import MapperDetails from './components/mappers/mapper-details';
import ProductSynchronization from './components/product-synchronization';
import ServiceNotConfigured from './components/service-not-configured';
import SetupStateError from './components/setup-state-error';
import ErrorAlert from './components/ui/error-alert';
import { ConnectorStateProvider, useConnectorState } from './contexts';
import { useTikTokService } from './hooks/use-tiktok-service';

/**
 * Nimbus inside the shell: its links navigate through the shell's router, in
 * the Merchant Center user's language. The Merchant Center already loads the
 * Inter font, so Nimbus does not load it again.
 */
const Nimbus = ({ children }: { children: ReactNode }) => {
  const history = useHistory();
  const locale = useApplicationContext((ctx) => ctx.user?.locale);
  const router = useMemo(
    () => ({
      navigate: (to: string) => history.push(to),
      useHref: (to: string) => history.createHref({ pathname: to }),
    }),
    [history]
  );
  return (
    <NimbusProvider
      loadFonts={false}
      router={router}
      {...(locale ? { locale } : {})}
    >
      {children}
    </NimbusProvider>
  );
};

const RoutesContent = () => {
  const match = useRouteMatch();
  const { showConfigWizard, loading, error, stateUnknown } =
    useConnectorState();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (stateUnknown && error) {
    return (
      <Stack direction="column" gap="400" padding="600">
        <SetupStateError error={error} />
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap="400" padding="600">
      {error && (
        <ErrorAlert title="The setup state could not be read" error={error} />
      )}
      <Switch>
        <Route path={`${match.path}/mappers/new`} exact>
          <MapperNew />
        </Route>
        <Route path={`${match.path}/mappers/:productTypeId`} exact>
          <MapperDetails />
        </Route>
        <Route path={`${match.path}/mappers`} exact>
          <MappersList />
        </Route>
        <Route path={`${match.path}/product-synchronization`} exact>
          <ProductSynchronization />
        </Route>
        <Route>{showConfigWizard ? <ConfigWizard /> : <Welcome />}</Route>
      </Switch>
    </Stack>
  );
};

const ApplicationRoutes = () => {
  const { configured } = useTikTokService();

  return (
    <Nimbus>
      {configured ? (
        <ConnectorStateProvider>
          <RoutesContent />
        </ConnectorStateProvider>
      ) : (
        <ServiceNotConfigured />
      )}
    </Nimbus>
  );
};
ApplicationRoutes.displayName = 'ApplicationRoutes';

export default ApplicationRoutes;
