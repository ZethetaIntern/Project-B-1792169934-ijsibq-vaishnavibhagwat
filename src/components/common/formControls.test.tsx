import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import {
  describe, expect, it, vi,
} from 'vitest';
import { Checkbox } from './Checkbox';
import { CurrencyInput } from './CurrencyInput';
import { ErrorMessage } from './ErrorMessage';
import { Input, TextField } from './Input';
import { MaskedInput } from './MaskedInput';
import { RadioGroup } from './RadioGroup';
import { SelectMenu } from './SelectMenu';
import { formatPanInput } from '../../utils/inputFormatting';

describe('Input (compound)', () => {
  it('associates label, help text and error with the field', () => {
    render(
      <Input error="Enter your full name">
        <Input.Label>Full name</Input.Label>
        <Input.HelpText>As printed on your PAN card.</Input.HelpText>
        <Input.Field />
        <Input.Error />
      </Input>,
    );
    const field = screen.getByRole('textbox', { name: /full name/i });
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAttribute('aria-required', 'true');
    expect(field).toHaveAccessibleDescription(/as printed on your pan card\. enter your full name/i);
  });

  it('marks optional fields in text and does not set aria-required', () => {
    render(<TextField label="Alternate mobile" optional />);
    const field = screen.getByRole('textbox', { name: /alternate mobile/i });
    expect(screen.getByText('Optional')).toBeInTheDocument();
    expect(field).not.toHaveAttribute('aria-required');
  });

  it('works controlled and uncontrolled', async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState('');
      return <TextField label="City" value={value} onChange={(e) => setValue(e.target.value)} />;
    }
    render(
      <>
        <Controlled />
        <TextField label="State" defaultValue="Kerala" />
      </>,
    );
    await user.type(screen.getByRole('textbox', { name: /city/i }), 'Kochi');
    expect(screen.getByRole('textbox', { name: /city/i })).toHaveValue('Kochi');
    expect(screen.getByRole('textbox', { name: /state/i })).toHaveValue('Kerala');
  });

  it('throws a helpful error when a part is used outside the root', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Input.Label>Orphan</Input.Label>)).toThrow(/inside an <Input>/);
  });
});

describe('ErrorMessage', () => {
  it('is a polite live alert region that is always mounted', () => {
    const { rerender } = render(<ErrorMessage id="err" />);
    const region = screen.getByRole('alert');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toBeEmptyDOMElement();
    rerender(<ErrorMessage id="err" message="PAN must be 10 characters" />);
    expect(screen.getByRole('alert')).toHaveTextContent('PAN must be 10 characters');
  });
});

describe('CurrencyInput', () => {
  it('groups digits the Indian way and reports the numeric value', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    function Harness() {
      const [value, setValue] = useState<number | null>(null);
      return (
        <CurrencyInput
          label="Loan amount"
          value={value}
          onValueChange={(next) => {
            setValue(next);
            onValueChange(next);
          }}
        />
      );
    }
    render(<Harness />);
    const field = screen.getByRole('textbox', { name: /loan amount/i });
    await user.type(field, '1050000');
    expect(field).toHaveValue('10,50,000');
    expect(onValueChange).toHaveBeenLastCalledWith(1_050_000);
    await user.clear(field);
    expect(onValueChange).toHaveBeenLastCalledWith(null);
  });

  it('strips non-digit characters when used uncontrolled', async () => {
    const user = userEvent.setup();
    render(<CurrencyInput label="Monthly rent" />);
    const field = screen.getByRole('textbox', { name: /monthly rent/i });
    await user.type(field, '25a0b00');
    expect(field).toHaveValue('25,000');
  });
});

describe('MaskedInput', () => {
  it('shows only the last four characters after blur and can be revealed', async () => {
    const user = userEvent.setup();
    render(<MaskedInput label="PAN" revealLabel="PAN" format={formatPanInput} />);
    const field = screen.getByRole('textbox', { name: /^pan/i });
    await user.type(field, 'abcpe1234f');
    expect(field).toHaveValue('ABCPE1234F');
    await user.tab();
    expect(screen.getByText('••••••234F')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show PAN' }));
    expect(screen.queryByText('••••••234F')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide PAN' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('RadioGroup', () => {
  it('exposes a named group and selects options', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RadioGroup
        name="gender"
        legend="Gender"
        options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]}
        onChange={onChange}
        error="Select your gender"
      />,
    );
    expect(screen.getByRole('group', { name: /gender/i })).toBeInTheDocument();
    await user.click(screen.getByLabelText('Female'));
    expect(screen.getByLabelText('Female')).toBeChecked();
    expect(onChange).toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Select your gender');
  });
});

describe('Checkbox', () => {
  it('is never pre-ticked and toggles from its label', async () => {
    const user = userEvent.setup();
    render(<Checkbox label="I consent to Aadhaar verification" />);
    const box = screen.getByRole('checkbox', { name: /aadhaar/i });
    expect(box).not.toBeChecked();
    await user.click(screen.getByText(/i consent/i));
    expect(box).toBeChecked();
  });
});

describe('SelectMenu', () => {
  const options = [
    { value: 'manufacturing', label: 'Manufacturing' },
    { value: 'retail', label: 'Retail and trading' },
    { value: 'services', label: 'Services' },
  ];

  it('supports keyboard selection and emits register-compatible events', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SelectMenu name="businessType" label="Business type" options={options} onChange={onChange} />);
    const trigger = screen.getByRole('combobox', { name: /business type/i });
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenCalledWith({ target: { name: 'businessType', value: 'retail' }, type: 'change' });
    expect(trigger).toHaveTextContent('Retail and trading');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('selects with the mouse and supports type-ahead', async () => {
    const user = userEvent.setup();
    render(<SelectMenu name="type" label="Type" options={options} />);
    const trigger = screen.getByRole('combobox', { name: /type/i });
    await user.click(trigger);
    await user.click(screen.getByRole('option', { name: 'Services' }));
    expect(trigger).toHaveTextContent('Services');
    trigger.focus();
    await user.keyboard('m');
    expect(screen.getByRole('option', { name: 'Manufacturing' })).toHaveAttribute('id', trigger.getAttribute('aria-activedescendant'));
    await user.keyboard('{Escape}');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});
