import type { ReactNode } from 'react';
import { Button, Heading, Stack, Text } from '@commercetools/nimbus';
import { ArrowBack } from '@commercetools/nimbus-icons';

type Props = {
  title: string;
  description?: string;
  /** Shows a Back button that calls this. */
  onBack?: () => void;
  actions?: ReactNode;
  children?: ReactNode;
};

/** A screen: an optional back button, a title with actions, then content. */
const Page = ({ title, description, onBack, actions, children }: Props) => (
  <Stack direction="column" gap="400" maxWidth="1100px">
    {onBack && (
      <div>
        <Button
          variant="ghost"
          size="sm"
          colorPalette="primary"
          onPress={onBack}
        >
          <ArrowBack />
          Back
        </Button>
      </div>
    )}
    <Stack
      direction="row"
      gap="400"
      justifyContent="space-between"
      alignItems="center"
    >
      <Heading as="h1" size="lg">
        {title}
      </Heading>
      {actions}
    </Stack>
    {description && <Text color="neutral.11">{description}</Text>}
    {children}
  </Stack>
);

Page.displayName = 'Page';

export default Page;
