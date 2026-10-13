import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Combobox } from './Combobox';

const COMPANIES = ['Infosys', 'Indian Oil Corporation', 'ICICI Bank', 'Wipro'];

function Controlled() {
  const [value, setValue] = useState('');
  return (
    <>
      <Combobox label="Company" options={COMPANIES} value={value} onChange={(event) => setValue(event.target.value)} />
      <output data-testid="value">{value}</output>
    </>
  );
}

describe('Combobox', () => {
  it('filters suggestions and picks one with the keyboard', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    const input = screen.getByRole('combobox', { name: /company/i });
    await user.type(input, 'in');
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('option').map((option) => option.textContent))
      .toEqual(['Infosys', 'Indian Oil Corporation']);
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(input).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[1].id);
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('value')).toHaveTextContent('Indian Oil Corporation');
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('allows free text and picks with the mouse', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    const input = screen.getByRole('combobox', { name: /company/i });
    await user.type(input, 'wip');
    await user.click(screen.getByRole('option', { name: 'Wipro' }));
    expect(screen.getByTestId('value')).toHaveTextContent('Wipro');
    await user.clear(input);
    await user.type(input, 'Verma Tools');
    await user.keyboard('{Escape}');
    expect(screen.getByTestId('value')).toHaveTextContent('Verma Tools');
  });
});
