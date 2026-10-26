import { Select } from '@commercetools/nimbus';

export type SelectOption = { value: string; label: string };

type Props = {
  name: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  'aria-label'?: string;
  placeholder?: string;
  isDisabled?: boolean;
};

/** One value from a list, as a string in and out. */
const OptionSelect = ({
  name,
  value,
  options,
  onChange,
  placeholder,
  isDisabled,
  ...rest
}: Props) => (
  <Select.Root
    name={name}
    aria-label={rest['aria-label'] ?? name}
    selectedKey={options.some((o) => o.value === value) ? value : null}
    onSelectionChange={(key) => {
      if (key !== null) onChange(String(key));
    }}
    isDisabled={isDisabled}
    isClearable={false}
    width="full"
    {...(placeholder ? { placeholder } : {})}
  >
    <Select.Options items={options}>
      {(option: SelectOption) => (
        <Select.Option id={option.value} textValue={option.label}>
          {option.label}
        </Select.Option>
      )}
    </Select.Options>
  </Select.Root>
);

OptionSelect.displayName = 'OptionSelect';

export default OptionSelect;
