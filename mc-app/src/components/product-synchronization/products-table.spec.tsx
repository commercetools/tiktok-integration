import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  NimbusProvider,
  type DataTableColumnItem,
} from '@commercetools/nimbus';
import ProductsTable from './products-table';

type Row = { id: string };

// jsdom has no ResizeObserver, which the data table needs.
beforeAll(() => {
  global.ResizeObserver = class {
    observe = jest.fn();
    unobserve = jest.fn();
    disconnect = jest.fn();
  };
});

// NimbusProvider renders a <script> (colour-mode bootstrap); React warns about it under jsdom.
beforeEach(() => {
  const original = console.error;
  jest.spyOn(console, 'error').mockImplementation((message, ...args) => {
    if (typeof message === 'string' && message.includes('script tag')) return;
    original(message, ...args);
  });
});

const columns: DataTableColumnItem<Row>[] = [
  { id: 'id', header: 'Id', accessor: (row) => row.id, isRowHeader: true },
];
const rows = Array.from({ length: 25 }, (_, i) => ({ id: `row-${i + 1}` }));

const renderTable = (
  selection?: Parameters<typeof ProductsTable<Row>>[0]['selection']
) =>
  render(
    <NimbusProvider loadFonts={false}>
      <ProductsTable
        ariaLabel="Things"
        columns={columns}
        rows={rows}
        selection={selection}
      />
    </NimbusProvider>
  );

it('shows the first page and changes page with the pagination', () => {
  renderTable();
  expect(screen.getByText('row-1')).toBeTruthy();
  expect(screen.getByText('row-10')).toBeTruthy();
  expect(screen.queryByText('row-11')).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: /next page/i }));

  expect(screen.queryByText('row-1')).toBeNull();
  expect(screen.getByText('row-11')).toBeTruthy();
  expect(screen.getByText('row-20')).toBeTruthy();
});

it('keeps selections made on other pages', () => {
  const Harness = () => {
    const [selectedIds, setSelectedIds] = useState(new Set(['row-15']));
    return (
      <NimbusProvider loadFonts={false}>
        <ProductsTable
          ariaLabel="Things"
          columns={columns}
          rows={rows}
          selection={{ selectedIds, onSelectionChange: setSelectedIds }}
        />
        <span data-testid="selected">{[...selectedIds].sort().join(',')}</span>
      </NimbusProvider>
    );
  };
  render(<Harness />);

  fireEvent.click(screen.getAllByRole('checkbox')[1]);

  expect(screen.getByTestId('selected').textContent).toBe('row-1,row-15');
});
