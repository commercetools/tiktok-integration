import {
  CANCELLATION_STATUSES,
  mapCancellationStatus,
  mapReturnStatus,
  RETURN_STATUSES,
} from './return.mapper';

describe('mapReturnStatus', () => {
  it('covers all 13 documented return statuses plus AWAITING_BUYER_RESPONSE', () => {
    expect(RETURN_STATUSES).toHaveLength(14);
    expect(
      RETURN_STATUSES.filter((s) => s.startsWith('REPLACEMENT_')),
    ).toHaveLength(5);
  });

  it('classifies requests that need the seller', () => {
    expect(mapReturnStatus('RETURN_OR_REFUND_REQUEST_PENDING')).toEqual({
      kind: 'return',
      phase: 'Requested',
      refund: 'pending',
      terminal: false,
      requiresSellerAction: true,
    });
    expect(
      mapReturnStatus('REPLACEMENT_REQUEST_PENDING')?.requiresSellerAction,
    ).toBe(true);
  });

  it('marks refunded and rejected outcomes as terminal', () => {
    expect(mapReturnStatus('RETURN_OR_REFUND_REQUEST_COMPLETE')).toMatchObject({
      phase: 'Completed',
      refund: 'refunded',
      terminal: true,
    });
    expect(mapReturnStatus('REJECT_RECEIVE_PACKAGE')).toMatchObject({
      phase: 'Rejected',
      refund: 'denied',
      terminal: true,
    });
    expect(mapReturnStatus('REPLACEMENT_REQUEST_REFUND_SUCCESS')).toMatchObject(
      {
        kind: 'replacement',
        refund: 'refunded',
      },
    );
  });

  it('every status is classified consistently', () => {
    for (const status of RETURN_STATUSES) {
      const result = mapReturnStatus(status);
      expect(result).toBeDefined();
      if (result?.terminal) expect(result.requiresSellerAction).toBe(false);
    }
  });

  it('returns undefined for unknown statuses', () => {
    expect(mapReturnStatus('NOPE')).toBeUndefined();
    expect(mapReturnStatus(undefined)).toBeUndefined();
  });
});

describe('mapCancellationStatus', () => {
  it('classifies cancellation requests', () => {
    expect(CANCELLATION_STATUSES).toHaveLength(4);
    expect(mapCancellationStatus('CANCELLATION_REQUEST_PENDING')).toMatchObject(
      {
        kind: 'cancellation',
        requiresSellerAction: true,
      },
    );
    expect(
      mapCancellationStatus('cancellation_request_complete'),
    ).toMatchObject({
      refund: 'refunded',
      terminal: true,
    });
    expect(mapCancellationStatus('X')).toBeUndefined();
  });
});
