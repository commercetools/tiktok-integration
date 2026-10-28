import type { ReactNode } from 'react';
import { FormField } from '@commercetools/nimbus';

type Props = {
  label: string;
  description?: string;
  isRequired?: boolean;
  children: ReactNode;
};

/** A labelled form control. */
const Field = ({ label, description, isRequired, children }: Props) => (
  <FormField.Root isRequired={isRequired}>
    <FormField.Label>{label}</FormField.Label>
    <FormField.Input>{children}</FormField.Input>
    {description && (
      <FormField.Description>{description}</FormField.Description>
    )}
  </FormField.Root>
);

Field.displayName = 'Field';

export default Field;
