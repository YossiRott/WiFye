import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateWordlist } from '../../../api/endpoints';
import { WordlistGeneratorSection } from '../WordlistGeneratorSection';

vi.mock('../../../api/endpoints', () => ({
  generateWordlist: vi.fn(),
}));

describe('WordlistGeneratorSection', () => {
  beforeEach(() => vi.resetAllMocks());

  it('sends seeds and mutation options to the API on Generate', async () => {
    vi.mocked(generateWordlist).mockResolvedValue({ count: 2, preview: ['admin1', 'admin123'], path: '/tmp/x.txt' });
    const onGenerated = vi.fn();
    render(<WordlistGeneratorSection onGenerated={onGenerated} />);

    fireEvent.change(screen.getByPlaceholderText(/admin/), { target: { value: 'admin\npassword' } });
    fireEvent.click(screen.getByLabelText(/Combine Words/i));
    fireEvent.click(screen.getByText('Generate'));

    await waitFor(() => expect(generateWordlist).toHaveBeenCalledTimes(1));
    expect(generateWordlist).toHaveBeenCalledWith({
      seeds: ['admin', 'password'],
      options: { capitals: true, leet: true, numbers: true, special: true, combos: true, prefixes: false },
    });

    await waitFor(() => expect(screen.getByText('2 passwords generated')).toBeInTheDocument());
    expect(onGenerated).toHaveBeenCalledTimes(1);
  });

  it('ignores blank lines when splitting seed words', async () => {
    vi.mocked(generateWordlist).mockResolvedValue({ count: 1, preview: ['admin1'], path: '/tmp/x.txt' });
    render(<WordlistGeneratorSection onGenerated={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/admin/), { target: { value: '  admin  \n\n  \n' } });
    fireEvent.click(screen.getByText('Generate'));

    await waitFor(() => expect(generateWordlist).toHaveBeenCalledTimes(1));
    expect(generateWordlist).toHaveBeenCalledWith(expect.objectContaining({ seeds: ['admin'] }));
  });

  it('shows an error message when the API reports one', async () => {
    vi.mocked(generateWordlist).mockResolvedValue({ error: 'No words generated', count: 0, preview: [], path: '' });
    render(<WordlistGeneratorSection onGenerated={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/admin/), { target: { value: 'x' } });
    fireEvent.click(screen.getByText('Generate'));

    await waitFor(() => expect(screen.getByText('No words generated')).toBeInTheDocument());
  });

  it('shows a client-side error without calling the API when there are no seeds', async () => {
    render(<WordlistGeneratorSection onGenerated={vi.fn()} />);
    fireEvent.click(screen.getByText('Generate'));

    await waitFor(() => expect(screen.getByText('Enter at least one seed word.')).toBeInTheDocument());
    expect(generateWordlist).not.toHaveBeenCalled();
  });
});
