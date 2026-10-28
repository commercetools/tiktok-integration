import { Alert } from '@commercetools/nimbus';

const ErrorAlert = ({ title, error }: { title: string; error: Error }) => (
  <Alert.Root variant="outlined" colorPalette="critical">
    <Alert.Title>{title}</Alert.Title>
    <Alert.Description>{error.message}</Alert.Description>
  </Alert.Root>
);

ErrorAlert.displayName = 'ErrorAlert';

export default ErrorAlert;
