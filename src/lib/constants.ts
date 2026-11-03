export const SIZES = ["XS", "S", "M", "L"] as const;
export const FINGERS = ["Thumb", "Index", "Middle", "Ring", "Pinky"] as const;
export const PATTERNS = ["solid", "french", "ombre", "chrome", "glitter", "dots", "marble"] as const;
export const ALL_SHAPES = ["Almond", "Coffin", "Square", "Oval", "Stiletto"] as const;
export const ALL_LENGTHS = ["Short", "Medium", "Long"] as const;

export const ORDER_STATUSES = [
  "PENDING", "CONFIRMED", "IN_PRODUCTION", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED", "RTO",
] as const;

export const STATUS_LABEL: Record<string, string> = {
  PENDING: "Awaiting confirmation",
  CONFIRMED: "Confirmed",
  IN_PRODUCTION: "Being hand-painted",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RTO: "Returned to us",
};

export const REQUEST_STATUSES = ["NEW", "QUOTED", "ACCEPTED", "IN_PROGRESS", "DONE", "DECLINED"] as const;

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh",
  "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry",
  "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal",
];
