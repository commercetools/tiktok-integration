import { useRouteMatch } from 'react-router-dom';
import { useIntl } from 'react-intl';
import {
  Card,
  Heading,
  Link,
  SimpleGrid,
  Stack,
  Text,
} from '@commercetools/nimbus';
import { ChevronRight } from '@commercetools/nimbus-icons';
import messages from './messages';
import Page from '../ui/page';

type InfoCardProps = {
  title: string;
  content: string;
  linkTo: string;
};

const InfoCard = ({ title, content, linkTo }: InfoCardProps) => (
  <Card.Root variant="outlined-elevated">
    <Card.Body>
      <Stack direction="column" gap="200">
        <Heading as="h3" size="md">
          <Link href={linkTo} fontColor="primary">
            {title}
            <ChevronRight />
          </Link>
        </Heading>
        <Text>{content}</Text>
      </Stack>
    </Card.Body>
  </Card.Root>
);
InfoCard.displayName = 'InfoCard';

const Welcome = () => {
  const match = useRouteMatch();
  const intl = useIntl();

  return (
    <Page
      title={intl.formatMessage(messages.title)}
      description={intl.formatMessage(messages.subtitle)}
    >
      <SimpleGrid columns={{ base: 1, md: 2 }} gap="400">
        <InfoCard
          title={intl.formatMessage(messages.cardMapperTitle)}
          content={intl.formatMessage(messages.cardMapperContent)}
          linkTo={`${match.url}/mappers`}
        />
        <InfoCard
          title={intl.formatMessage(messages.productSynchronizationTitle)}
          content={intl.formatMessage(messages.productSynchronizationContent)}
          linkTo={`${match.url}/product-synchronization`}
        />
      </SimpleGrid>
    </Page>
  );
};
Welcome.displayName = 'Welcome';

export default Welcome;
