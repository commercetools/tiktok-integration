import { RadioInput, Stack, Text, TextInput } from '@commercetools/nimbus';
import {
  isValidKey,
  toKey,
  type ResourceChoice,
} from '../../hooks/use-store-setup';
import Field from '../ui/field';
import OptionSelect, { type SelectOption } from '../ui/option-select';

export type Choice = {
  mode: 'existing' | 'new';
  id: string;
  name: string;
  key: string;
  keyEdited: boolean;
};

/** Starts on "existing"; the field falls back to "new" by itself when nothing exists. */
export const initialChoice = (name: string): Choice => ({
  mode: 'existing',
  id: '',
  name,
  key: toKey(name),
  keyEdited: false,
});

/** The choice to act on, or undefined while the form for it is incomplete. */
export const resolveChoice = (
  choice: Choice,
  optionCount: number
): ResourceChoice | undefined => {
  if (optionCount > 0 && choice.mode === 'existing') {
    return choice.id ? { mode: 'existing', id: choice.id } : undefined;
  }
  const name = choice.name.trim();
  return name && isValidKey(choice.key)
    ? { mode: 'new', name, key: choice.key }
    : undefined;
};

type Props = {
  /** What is chosen, singular: "product selection", "price channel". */
  noun: string;
  options: SelectOption[];
  value: Choice;
  onChange: (value: Choice) => void;
  isDisabled?: boolean;
  /** Shown when the project has nothing to choose from. */
  emptyHint?: string;
};

/** Pick an existing resource, or give the name and key of a new one. */
const ResourceChoiceField = ({
  noun,
  options,
  value,
  onChange,
  isDisabled,
  emptyHint,
}: Props) => {
  const hasOptions = options.length > 0;
  const mode = hasOptions ? value.mode : 'new';

  return (
    <Stack direction="column" gap="300">
      <RadioInput.Root
        name={`${noun}-mode`}
        aria-label={`Existing or new ${noun}`}
        orientation="horizontal"
        value={mode}
        onChange={(next) =>
          onChange({ ...value, mode: next === 'new' ? 'new' : 'existing' })
        }
        isDisabled={isDisabled}
      >
        <RadioInput.Option value="existing" isDisabled={!hasOptions}>
          Use an existing {noun}
        </RadioInput.Option>
        <RadioInput.Option value="new">Create a new {noun}</RadioInput.Option>
      </RadioInput.Root>
      {!hasOptions && emptyHint && (
        <Text textStyle="sm" color="neutral.11">
          {emptyHint}
        </Text>
      )}
      {mode === 'existing' ? (
        <Field label={`Select ${noun}`} isRequired>
          <OptionSelect
            name={`${noun}-existing`}
            aria-label={`Select ${noun}`}
            value={value.id}
            options={options}
            onChange={(id) => onChange({ ...value, id })}
            isDisabled={isDisabled}
            placeholder={`Select a ${noun}`}
          />
        </Field>
      ) : (
        <Stack direction="column" gap="300">
          <Field label={`Name of the new ${noun}`} isRequired>
            <TextInput
              name={`${noun}-name`}
              aria-label={`Name of the new ${noun}`}
              value={value.name}
              onChange={(name) =>
                onChange({
                  ...value,
                  name,
                  ...(value.keyEdited ? {} : { key: toKey(name) }),
                })
              }
              isDisabled={isDisabled}
            />
          </Field>
          <Field
            label={`Key of the new ${noun}`}
            description="Letters, digits, - and _ only, at least 2 characters. It can not be changed later."
            isRequired
          >
            <TextInput
              name={`${noun}-key`}
              aria-label={`Key of the new ${noun}`}
              value={value.key}
              onChange={(key) => onChange({ ...value, key, keyEdited: true })}
              isDisabled={isDisabled}
            />
          </Field>
        </Stack>
      )}
    </Stack>
  );
};

ResourceChoiceField.displayName = 'ResourceChoiceField';

export default ResourceChoiceField;
