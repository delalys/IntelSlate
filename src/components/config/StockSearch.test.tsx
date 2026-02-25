/**
 * StockSearch Component Tests
 *
 * Tests for the stock search autocomplete component
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextIntlWrapper } from '@/test/utils';
import { StockSearch } from './StockSearch';

// =============================================================================
// Mocks
// =============================================================================

// Mock the searchStocks server action
vi.mock('@/actions/stock-search', () => ({
  searchStocks: vi.fn(),
}));

import { searchStocks } from '@/actions/stock-search';

const mockSearchStocks = searchStocks as ReturnType<typeof vi.fn>;

const renderWithIntl = (ui: React.ReactElement) =>
  render(ui, {
    wrapper: ({ children }) => <NextIntlWrapper>{children}</NextIntlWrapper>,
  });

// =============================================================================
// Test Data
// =============================================================================

const MOCK_SEARCH_RESULTS = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc',
    type: 'Equity',
    region: 'United States',
    currency: 'USD',
    matchScore: 1.0,
  },
  {
    symbol: 'APLE',
    name: 'Apple Hospitality REIT Inc',
    type: 'Equity',
    region: 'United States',
    currency: 'USD',
    matchScore: 0.8,
  },
];

// =============================================================================
// Tests
// =============================================================================

describe('StockSearch', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the search input', () => {
    renderWithIntl(<StockSearch onSelect={mockOnSelect} />);

    expect(screen.getByPlaceholderText(/search.*ticker/i)).toBeInTheDocument();
  });

  it('should not search when query is less than 2 characters', async () => {
    renderWithIntl(<StockSearch onSelect={mockOnSelect} />);

    const input = screen.getByPlaceholderText(/search.*ticker/i);
    fireEvent.change(input, { target: { value: 'A' } });

    // Wait for potential debounce
    await new Promise((r) => setTimeout(r, 400));

    expect(mockSearchStocks).not.toHaveBeenCalled();
  });

  it('should search after debounce period when query is 2+ characters', async () => {
    mockSearchStocks.mockResolvedValue({
      success: true,
      data: MOCK_SEARCH_RESULTS,
    });
    renderWithIntl(<StockSearch onSelect={mockOnSelect} />);

    const input = screen.getByPlaceholderText(/search.*ticker/i);
    fireEvent.change(input, { target: { value: 'AA' } });

    // Should not call immediately
    expect(mockSearchStocks).not.toHaveBeenCalled();

    // Wait for debounce
    await waitFor(
      () => {
        expect(mockSearchStocks).toHaveBeenCalledWith('AA');
      },
      { timeout: 500 },
    );
  });

  it('should display search results in dropdown', async () => {
    mockSearchStocks.mockResolvedValue({
      success: true,
      data: MOCK_SEARCH_RESULTS,
    });

    renderWithIntl(<StockSearch onSelect={mockOnSelect} />);

    const input = screen.getByPlaceholderText(/search.*ticker/i);
    fireEvent.change(input, { target: { value: 'AAPL' } });

    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('Apple Inc')).toBeInTheDocument();
      // Both results have "United States", so use getAllByText
      expect(screen.getAllByText('United States')).toHaveLength(2);
    });
  });

  it("should show 'No matching stocks found' when no results", async () => {
    mockSearchStocks.mockResolvedValue({
      success: true,
      data: [],
    });

    renderWithIntl(<StockSearch onSelect={mockOnSelect} />);

    const input = screen.getByPlaceholderText(/search.*ticker/i);
    fireEvent.change(input, { target: { value: 'XYZNOTEXIST' } });

    await waitFor(() => {
      expect(screen.getByText(/no matching stocks found/i)).toBeInTheDocument();
    });
  });

  it('should call onSelect with selected stock', async () => {
    mockSearchStocks.mockResolvedValue({
      success: true,
      data: MOCK_SEARCH_RESULTS,
    });

    renderWithIntl(<StockSearch onSelect={mockOnSelect} />);

    const input = screen.getByPlaceholderText(/search.*ticker/i);
    fireEvent.change(input, { target: { value: 'AAPL' } });

    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument();
    });

    // Click on the first result
    const resultItem = screen.getByText('AAPL').closest('button');
    if (resultItem) fireEvent.click(resultItem);

    expect(mockOnSelect).toHaveBeenCalledWith(MOCK_SEARCH_RESULTS[0]);
  });

  it('should clear dropdown after selection', async () => {
    mockSearchStocks.mockResolvedValue({
      success: true,
      data: MOCK_SEARCH_RESULTS,
    });

    renderWithIntl(<StockSearch onSelect={mockOnSelect} />);

    const input = screen.getByPlaceholderText(/search.*ticker/i);
    fireEvent.change(input, { target: { value: 'AAPL' } });

    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument();
    });

    const resultItem = screen.getByText('AAPL').closest('button');
    if (resultItem) fireEvent.click(resultItem);

    await waitFor(() => {
      expect(screen.queryByText('Apple Inc')).not.toBeInTheDocument();
    });
  });

  it('should populate input with ticker after selection', async () => {
    mockSearchStocks.mockResolvedValue({
      success: true,
      data: MOCK_SEARCH_RESULTS,
    });

    renderWithIntl(<StockSearch onSelect={mockOnSelect} />);

    const input = screen.getByPlaceholderText(
      /search.*ticker/i,
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'AA' } });

    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument();
    });

    const resultItem = screen.getByText('AAPL').closest('button');
    if (resultItem) fireEvent.click(resultItem);

    expect(input.value).toBe('AAPL');
  });

  it('should handle API errors gracefully', async () => {
    mockSearchStocks.mockResolvedValue({
      success: false,
      error: 'API error occurred',
    });

    renderWithIntl(<StockSearch onSelect={mockOnSelect} />);

    const input = screen.getByPlaceholderText(/search.*ticker/i);
    fireEvent.change(input, { target: { value: 'AAPL' } });

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('should show loading indicator while searching', async () => {
    // Create a promise that won't resolve until we tell it to
    let resolveSearch!: (value: unknown) => void;
    const searchPromise = new Promise((resolve) => {
      resolveSearch = resolve;
    });
    mockSearchStocks.mockReturnValue(searchPromise);

    renderWithIntl(<StockSearch onSelect={mockOnSelect} />);

    const input = screen.getByPlaceholderText(/search.*ticker/i);
    fireEvent.change(input, { target: { value: 'AAPL' } });

    // Wait for debounce and loading to appear
    await waitFor(() => {
      expect(screen.getByTestId('search-loading')).toBeInTheDocument();
    });

    // Resolve the search
    resolveSearch({
      success: true,
      data: MOCK_SEARCH_RESULTS,
    });

    await waitFor(() => {
      expect(screen.queryByTestId('search-loading')).not.toBeInTheDocument();
    });
  });

  it('should clear results when input is cleared', async () => {
    mockSearchStocks.mockResolvedValue({
      success: true,
      data: MOCK_SEARCH_RESULTS,
    });

    renderWithIntl(<StockSearch onSelect={mockOnSelect} />);

    const input = screen.getByPlaceholderText(/search.*ticker/i);
    fireEvent.change(input, { target: { value: 'AAPL' } });

    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument();
    });

    // Clear the input
    fireEvent.change(input, { target: { value: '' } });

    await waitFor(() => {
      expect(screen.queryByText('Apple Inc')).not.toBeInTheDocument();
    });
  });
});
