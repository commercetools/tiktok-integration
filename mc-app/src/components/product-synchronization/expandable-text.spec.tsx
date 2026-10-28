import { NimbusProvider } from '@commercetools/nimbus';
import {
  fireEvent,
  screen,
} from '@commercetools-frontend/application-shell/test-utils';
import { renderApplicationWithRedux } from '../../test-utils';
import ExpandableText from './expandable-text';

const LONG =
  'The product has no SKU on its master variant and no price for the TikTok channel, so TikTok would reject it.';

// jsdom does no layout, so the width of the text is faked.
const fakeWidths = (scrollWidth: number, clientWidth: number) => {
  jest
    .spyOn(HTMLElement.prototype, 'scrollWidth', 'get')
    .mockReturnValue(scrollWidth);
  jest
    .spyOn(HTMLElement.prototype, 'clientWidth', 'get')
    .mockReturnValue(clientWidth);
};

// NimbusProvider renders a <script> (colour-mode bootstrap); React warns about it under jsdom.
beforeEach(() => {
  const consoleError = console.error;
  jest.spyOn(console, 'error').mockImplementation((message, ...rest) => {
    if (typeof message === 'string' && message.includes('script tag')) return;
    consoleError(message, ...rest);
  });
});

const renderText = (text: string) =>
  renderApplicationWithRedux(
    <NimbusProvider loadFonts={false}>
      <ExpandableText>{text}</ExpandableText>
    </NimbusProvider>,
    { route: '/my-project/tiktok-connect', disableRoutePermissionCheck: true }
  );

it('offers no toggle when the text fits', async () => {
  fakeWidths(100, 100);
  renderText('Short reason');

  await screen.findByText('Short reason');
  expect(screen.queryByRole('button')).toBeNull();
});

it('shows a toggle for text that is cut off, with the full text as tooltip', async () => {
  fakeWidths(600, 320);
  renderText(LONG);

  const text = await screen.findByText(LONG);
  expect(text.getAttribute('title')).toBe(LONG);
  const toggle = await screen.findByRole('button', { name: 'Show full text' });
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
});

it('expands and collapses', async () => {
  fakeWidths(600, 320);
  renderText(LONG);

  fireEvent.click(
    await screen.findByRole('button', { name: 'Show full text' })
  );
  const less = await screen.findByRole('button', { name: 'Show less' });
  expect(less.getAttribute('aria-expanded')).toBe('true');
  expect(screen.getByText(LONG).getAttribute('title')).toBeNull();

  fireEvent.click(less);
  await screen.findByRole('button', { name: 'Show full text' });
  expect(screen.getByText(LONG).getAttribute('title')).toBe(LONG);
});
