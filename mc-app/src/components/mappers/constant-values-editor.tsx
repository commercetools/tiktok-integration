import {
  Button,
  IconButton,
  Stack,
  Text,
  TextInput,
} from '@commercetools/nimbus';
import { Add, DeleteOutline } from '@commercetools/nimbus-icons';
import type {
  TikTokAttributeValue,
  TikTokValue,
} from '../../hooks/use-tiktok-service';
import OptionSelect from '../ui/option-select';

type Props = {
  values: TikTokValue[];
  /** The values TikTok allows for the attribute, when it restricts them. */
  tiktokValues: TikTokAttributeValue[];
  onChange: (values: TikTokValue[]) => void;
};

/** Fixed TikTok values, sent for every product (for example "Dangerous goods: No"). */
const ConstantValuesEditor = ({ values, tiktokValues, onChange }: Props) => {
  const options = tiktokValues.flatMap((v) =>
    v.id ? [{ value: v.id, label: `${v.name ?? v.id} (${v.id})` }] : []
  );
  const replace = (index: number, value: TikTokValue) =>
    onChange(values.map((v, i) => (i === index ? value : v)));

  return (
    <Stack direction="column" gap="200">
      <Text fontWeight="600">Constant values</Text>
      {values.map((value, index) => (
        <Stack key={index} direction="row" gap="200" alignItems="center">
          {options.length > 0 ? (
            <OptionSelect
              name={`constant-${index}`}
              aria-label="TikTok value"
              value={value.id ?? ''}
              options={options}
              placeholder="TikTok value"
              onChange={(id) => replace(index, { id })}
            />
          ) : (
            <TextInput
              aria-label="TikTok value id"
              placeholder="TikTok value id"
              value={value.id ?? ''}
              onChange={(id) => replace(index, { id })}
            />
          )}
          <IconButton
            aria-label="Remove value"
            variant="ghost"
            size="sm"
            onPress={() => onChange(values.filter((_, i) => i !== index))}
          >
            <DeleteOutline />
          </IconButton>
        </Stack>
      ))}
      <div>
        <Button
          variant="outline"
          size="sm"
          colorPalette="primary"
          onPress={() => onChange([...values, { id: '' }])}
        >
          <Add />
          Add value
        </Button>
      </div>
    </Stack>
  );
};

ConstantValuesEditor.displayName = 'ConstantValuesEditor';

export default ConstantValuesEditor;
