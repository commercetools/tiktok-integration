/**
 * Convert TikTok price string to CommerceTools centAmount
 */
export const convertPriceToCentAmount = (priceString?: string): number => {
  if (!priceString) return 0;
  const price = parseFloat(priceString);
  return Math.round(price * 100); // Convert to cents
};
