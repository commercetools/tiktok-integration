type TCustomFieldValue = { name: string; value: unknown };

type TCustomFieldsHolder = {
  custom?: {
    type: { id: string; key: string };
    customFieldsRaw: TCustomFieldValue[];
  };
};

/**
 * The value of a custom field as the GraphQL `customFieldsRaw` returns it:
 * already decoded (`true`, `"7123"`, `42`), unlike the escaped JSON text the
 * mutations take. Decoding it again would turn the string "7123" into a number.
 */
export const readCustomField = (
  resource: TCustomFieldsHolder | undefined,
  fieldName: string
): unknown =>
  resource?.custom?.customFieldsRaw.find((field) => field.name === fieldName)
    ?.value;

type TCustomFieldInput = { name: string; value: string };

type TCustomAction =
  | {
      setCustomType: {
        type: { typeId: string; key: string };
        fields: TCustomFieldInput[];
      };
    }
  | { setCustomField: TCustomFieldInput };

/**
 * `setCustomType` replaces every custom field, so when the resource already
 * has the type only the given fields are touched. Values are JSON-encoded
 * text, as the mutations require.
 */
export const buildCustomFieldActions = (
  resource: TCustomFieldsHolder,
  typeKey: string,
  fields: Record<string, unknown>
): TCustomAction[] => {
  const entries = Object.entries(fields).map(([name, value]) => ({
    name,
    value: JSON.stringify(value),
  }));

  if (resource.custom?.type.key === typeKey) {
    return entries.map((entry) => ({ setCustomField: entry }));
  }

  return [
    {
      setCustomType: {
        type: { typeId: 'type', key: typeKey },
        fields: entries,
      },
    },
  ];
};
