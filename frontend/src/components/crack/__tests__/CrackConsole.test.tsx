import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CrackConsole } from '../CrackConsole';

describe('CrackConsole', () => {
  it('shows a running badge and live stats while not done', () => {
    render(
      <CrackConsole
        status="running"
        done={false}
        stats={{ progress: 42.5, speed: '1.2 kH/s' }}
        cracked={[]}
        onStop={vi.fn()}
        onNewSearch={vi.fn()}
      />,
    );
    expect(screen.getByText('Running…')).toBeInTheDocument();
    expect(screen.getByText('42.5%')).toBeInTheDocument();
    expect(screen.getByText('1.2 kH/s')).toBeInTheDocument();
  });

  it('shows cracked passwords when done with results', () => {
    render(
      <CrackConsole
        status="done"
        done
        stats={{}}
        cracked={[{ ssid: 'Net', password: 'hunter2' }]}
        onStop={vi.fn()}
        onNewSearch={vi.fn()}
      />,
    );
    expect(screen.getByText('1 Password Cracked!')).toBeInTheDocument();
    expect(screen.getByText('hunter2')).toBeInTheDocument();
  });

  it('pluralizes the badge for multiple cracked passwords', () => {
    render(
      <CrackConsole
        status="done"
        done
        stats={{}}
        cracked={[{ ssid: 'A', password: 'p1' }, { ssid: 'B', password: 'p2' }]}
        onStop={vi.fn()}
        onNewSearch={vi.fn()}
      />,
    );
    expect(screen.getByText('2 Passwords Cracked!')).toBeInTheDocument();
  });

  it('shows a not-found state when done with no results', () => {
    render(
      <CrackConsole
        status="done"
        done
        stats={{ tried: 1000, speed: '1 kH/s' }}
        cracked={[]}
        onStop={vi.fn()}
        onNewSearch={vi.fn()}
      />,
    );
    expect(screen.getByText('Not Found')).toBeInTheDocument();
    expect(screen.getByText('No passwords matched.')).toBeInTheDocument();
  });

  it('shows a distinct stopped state', () => {
    render(<CrackConsole status="stopped" done stats={{}} cracked={[]} onStop={vi.fn()} onNewSearch={vi.fn()} />);
    expect(screen.getByText('Stopped')).toBeInTheDocument();
    expect(screen.getByText('Search stopped.')).toBeInTheDocument();
  });

  it('disables the Stop button once done', () => {
    render(<CrackConsole status="done" done stats={{}} cracked={[]} onStop={vi.fn()} onNewSearch={vi.fn()} />);
    expect(screen.getByText('Stop')).toBeDisabled();
  });
});
