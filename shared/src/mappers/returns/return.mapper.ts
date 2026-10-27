/**
 * TikTok return/refund/replacement (RETURN_STATUS_CHANGE) and cancellation
 * (CANCELLATION_STATUS_CHANGE) statuses, classified for order handling.
 */

export type ReverseKind = 'return' | 'replacement' | 'cancellation';

export type ReversePhase =
  | 'Requested'
  | 'AwaitingBuyer'
  | 'InReturn'
  | 'Approved'
  | 'Rejected'
  | 'Cancelled'
  | 'Completed';

export type RefundOutcome = 'none' | 'pending' | 'refunded' | 'denied';

export interface ReverseStatusInfo {
  kind: ReverseKind;
  phase: ReversePhase;
  refund: RefundOutcome;
  /** No further status changes are expected for this request. */
  terminal: boolean;
  /** The seller has to review or act on the request. */
  requiresSellerAction: boolean;
}

const info = (
  kind: ReverseKind,
  phase: ReversePhase,
  refund: RefundOutcome,
  flags: { terminal?: boolean; requiresSellerAction?: boolean } = {},
): ReverseStatusInfo => ({
  kind,
  phase,
  refund,
  terminal: flags.terminal ?? false,
  requiresSellerAction: flags.requiresSellerAction ?? false,
});

const RETURN_STATUS: Record<string, ReverseStatusInfo> = {
  RETURN_OR_REFUND_REQUEST_PENDING: info('return', 'Requested', 'pending', {
    requiresSellerAction: true,
  }),
  REFUND_OR_RETURN_REQUEST_REJECT: info('return', 'Rejected', 'denied', {
    terminal: true,
  }),
  AWAITING_BUYER_SHIP: info('return', 'Approved', 'pending'),
  BUYER_SHIPPED_ITEM: info('return', 'InReturn', 'pending', {
    requiresSellerAction: true,
  }),
  REJECT_RECEIVE_PACKAGE: info('return', 'Rejected', 'denied', {
    terminal: true,
  }),
  RETURN_OR_REFUND_REQUEST_SUCCESS: info('return', 'Approved', 'pending'),
  RETURN_OR_REFUND_REQUEST_CANCEL: info('return', 'Cancelled', 'none', {
    terminal: true,
  }),
  RETURN_OR_REFUND_REQUEST_COMPLETE: info('return', 'Completed', 'refunded', {
    terminal: true,
  }),
  REPLACEMENT_REQUEST_PENDING: info('replacement', 'Requested', 'none', {
    requiresSellerAction: true,
  }),
  REPLACEMENT_REQUEST_REJECT: info('replacement', 'Rejected', 'denied', {
    terminal: true,
  }),
  REPLACEMENT_REQUEST_REFUND_SUCCESS: info(
    'replacement',
    'Completed',
    'refunded',
    { terminal: true },
  ),
  REPLACEMENT_REQUEST_CANCEL: info('replacement', 'Cancelled', 'none', {
    terminal: true,
  }),
  REPLACEMENT_REQUEST_COMPLETE: info('replacement', 'Completed', 'none', {
    terminal: true,
  }),
  AWAITING_BUYER_RESPONSE: info('return', 'AwaitingBuyer', 'pending'),
};

const CANCELLATION_STATUS: Record<string, ReverseStatusInfo> = {
  CANCELLATION_REQUEST_PENDING: info('cancellation', 'Requested', 'pending', {
    requiresSellerAction: true,
  }),
  CANCELLATION_REQUEST_SUCCESS: info('cancellation', 'Approved', 'pending'),
  CANCELLATION_REQUEST_COMPLETE: info('cancellation', 'Completed', 'refunded', {
    terminal: true,
  }),
  CANCELLATION_REQUEST_CANCEL: info('cancellation', 'Cancelled', 'none', {
    terminal: true,
  }),
};

const lookup = (
  table: Record<string, ReverseStatusInfo>,
  status?: string,
): ReverseStatusInfo | undefined =>
  status ? table[status.trim().toUpperCase()] : undefined;

export const RETURN_STATUSES = Object.keys(RETURN_STATUS);
export const CANCELLATION_STATUSES = Object.keys(CANCELLATION_STATUS);

/** Classifies a TikTok `return_status`; undefined when the status is unknown. */
export const mapReturnStatus = (
  status?: string,
): ReverseStatusInfo | undefined => lookup(RETURN_STATUS, status);

/** Classifies a TikTok cancellation status; undefined when unknown. */
export const mapCancellationStatus = (
  status?: string,
): ReverseStatusInfo | undefined => lookup(CANCELLATION_STATUS, status);
