import { useLayoutEffect, useRef, useState } from 'react';
import { IconButton, Stack, Text } from '@commercetools/nimbus';
import { ExpandLess, ExpandMore } from '@commercetools/nimbus-icons';

type Props = {
  children: string;
  /** Width the text is cut at while collapsed. */
  maxWidth?: string;
};

/** One line with an ellipsis; a toggle shows the whole text when it does not fit. */
const ExpandableText = ({ children, maxWidth = '320px' }: Props) => {
  const textRef = useRef<HTMLSpanElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useLayoutEffect(() => {
    const element = textRef.current;
    if (element && !expanded) {
      setOverflowing(element.scrollWidth > element.clientWidth);
    }
  }, [children, expanded]);

  return (
    <Stack direction="row" gap="100" alignItems="flex-start">
      <Text
        ref={textRef}
        {...(expanded
          ? { whiteSpace: 'normal', wordBreak: 'break-word' }
          : { truncate: true })}
        maxWidth={maxWidth}
        title={expanded ? undefined : children}
      >
        {children}
      </Text>
      {(overflowing || expanded) && (
        <IconButton
          size="2xs"
          variant="ghost"
          aria-label={expanded ? 'Show less' : 'Show full text'}
          aria-expanded={expanded}
          onPress={() => setExpanded(!expanded)}
        >
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      )}
    </Stack>
  );
};

ExpandableText.displayName = 'ExpandableText';

export default ExpandableText;
