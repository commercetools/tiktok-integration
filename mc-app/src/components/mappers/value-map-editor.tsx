import { useState } from 'react';
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

type Pair = { from: string; to: string };

type Props = {
  value: Record<string, TikTokValue> | undefined;
  /** The values TikTok allows for the attribute, when it restricts them. */
  tiktokValues: TikTokAttributeValue[];
  onChange: (value: Record<string, TikTokValue> | undefined) => void;
};

const toRecord = (pairs: Pair[]) => {
  const entries = pairs.filter((pair) => pair.from && pair.to);
  return entries.length > 0
    ? Object.fromEntries(entries.map((pair) => [pair.from, { id: pair.to }]))
    : undefined;
};

/** Translates commercetools attribute values (keys or labels) to TikTok value ids. */
const ValueMapEditor = ({ value, tiktokValues, onChange }: Props) => {
  const [pairs, setPairs] = useState<Pair[]>(
    Object.entries(value ?? {}).map(([from, to]) => ({
      from,
      to: to.id ?? to.name ?? '',
    }))
  );

  const update = (next: Pair[]) => {
    setPairs(next);
    onChange(toRecord(next));
  };

  const options = tiktokValues.flatMap((v) =>
    v.id ? [{ value: v.id, label: `${v.name ?? v.id} (${v.id})` }] : []
  );

  return (
    <Stack direction="column" gap="200">
      <Text fontWeight="600">Value map</Text>
      <Text textStyle="sm" color="neutral.11">
        Optional. Maps a commercetools value to the TikTok value id it stands
        for.
      </Text>
      {pairs.map((pair, index) => (
        <Stack key={index} direction="row" gap="200" alignItems="center">
          <TextInput
            aria-label="commercetools value"
            placeholder="commercetools value"
            value={pair.from}
            onChange={(from) =>
              update(pairs.map((p, i) => (i === index ? { ...p, from } : p)))
            }
          />
          {options.length > 0 ? (
            <OptionSelect
              name={`value-map-${index}`}
              aria-label="TikTok value"
              value={pair.to}
              options={options}
              placeholder="TikTok value"
              onChange={(to) =>
                update(pairs.map((p, i) => (i === index ? { ...p, to } : p)))
              }
            />
          ) : (
            <TextInput
              aria-label="TikTok value id"
              placeholder="TikTok value id"
              value={pair.to}
              onChange={(to) =>
                update(pairs.map((p, i) => (i === index ? { ...p, to } : p)))
              }
            />
          )}
          <IconButton
            aria-label="Remove value"
            variant="ghost"
            size="sm"
            onPress={() => update(pairs.filter((_, i) => i !== index))}
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
          onPress={() => update([...pairs, { from: '', to: '' }])}
        >
          <Add />
          Add value
        </Button>
      </div>
    </Stack>
  );
};

ValueMapEditor.displayName = 'ValueMapEditor';

export default ValueMapEditor;
