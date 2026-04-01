/**
 * Estimates shelf life in days for common food categories.
 * Used when adding items manually (without AI estimation).
 */

const SHELF_LIFE_DAYS: Record<string, number> = {
  // Dairy
  milk: 7,
  yogurt: 14,
  cheese: 21,
  cream: 10,
  butter: 30,
  "sour cream": 14,
  "cream cheese": 14,
  "cottage cheese": 10,

  // Meat & Poultry (raw)
  chicken: 2,
  beef: 4,
  pork: 4,
  "ground beef": 2,
  "ground turkey": 2,
  turkey: 2,
  steak: 4,
  bacon: 7,
  sausage: 2,
  ham: 5,
  fish: 2,
  salmon: 2,
  shrimp: 2,
  tuna: 2,

  // Fruits
  berries: 5,
  strawberries: 5,
  blueberries: 7,
  raspberries: 3,
  bananas: 5,
  apples: 21,
  oranges: 21,
  grapes: 7,
  lemons: 21,
  limes: 21,
  avocado: 4,
  mango: 5,
  peach: 4,
  pear: 5,
  watermelon: 7,
  pineapple: 5,
  kiwi: 7,

  // Vegetables
  lettuce: 7,
  spinach: 5,
  tomatoes: 7,
  tomato: 7,
  cucumber: 7,
  peppers: 7,
  onions: 30,
  garlic: 30,
  potatoes: 21,
  carrots: 21,
  broccoli: 5,
  cauliflower: 7,
  celery: 14,
  mushrooms: 7,
  zucchini: 7,
  corn: 3,
  "green beans": 5,
  cabbage: 14,
  kale: 5,
  asparagus: 4,

  // Eggs
  eggs: 28,

  // Bread & Bakery
  bread: 5,
  bagels: 5,
  tortillas: 14,

  // Condiments & Sauces (opened)
  ketchup: 180,
  mustard: 180,
  mayonnaise: 60,
  "soy sauce": 180,
  salsa: 14,

  // Drinks
  juice: 7,
  "orange juice": 7,
  "apple juice": 10,

  // Deli
  "deli meat": 5,
  hummus: 7,
  tofu: 7,
};

/**
 * Returns estimated expiry date as ISO string, or null if unknown.
 */
export function estimateExpiryDate(foodName: string): string | null {
  const lower = foodName.toLowerCase().trim();

  // Exact match first
  if (SHELF_LIFE_DAYS[lower] !== undefined) {
    return addDays(SHELF_LIFE_DAYS[lower]);
  }

  // Partial match: check if any key is contained in the name or vice versa
  for (const [key, days] of Object.entries(SHELF_LIFE_DAYS)) {
    if (lower.includes(key) || key.includes(lower)) {
      return addDays(days);
    }
  }

  return null;
}

function addDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 19).replace("T", " ");
}

/**
 * Returns the number of days until expiry (negative if expired).
 */
export function daysUntilExpiry(expiresAt: string): number {
  const now = new Date();
  const expiry = new Date(expiresAt.replace(" ", "T"));
  const diffMs = expiry.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Returns a human-readable expiry label.
 */
export function getExpiryLabel(expiresAt: string): string {
  const days = daysUntilExpiry(expiresAt);
  if (days < 0) return "Expired";
  if (days === 0) return "Expires today";
  if (days === 1) return "Expires tomorrow";
  if (days <= 3) return `Expires in ${days} days`;
  if (days <= 7) return `Expires in ${days} days`;
  return `Expires in ${days} days`;
}

/**
 * Returns a status: "expired" | "urgent" | "soon" | "ok"
 */
export function getExpiryStatus(expiresAt: string): "expired" | "urgent" | "soon" | "ok" {
  const days = daysUntilExpiry(expiresAt);
  if (days < 0) return "expired";
  if (days <= 2) return "urgent";
  if (days <= 5) return "soon";
  return "ok";
}
