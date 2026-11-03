export const SIZES = ["XS", "S", "M", "L"] as const;
export const FINGERS = ["Thumb", "Index", "Middle", "Ring", "Pinky"] as const;
export const PATTERNS = [
  "solid", "matte", "jelly", "french", "vfrench", "ombre",
  "chrome", "cateye", "velvet", "holo", "aura", "glitter",
  "dots", "marble", "swirl", "checker", "tortoise", "floral", "gems",
] as const;

export const PATTERN_LABEL: Record<string, string> = {
  solid: "Glossy", matte: "Matte", jelly: "Jelly", french: "French tip", vfrench: "V-French", ombre: "Ombre",
  chrome: "Chrome", cateye: "Cat eye", velvet: "Velvet", holo: "Holographic", aura: "Aura", glitter: "Glitter",
  dots: "Dots", marble: "Marble", swirl: "Swirl", checker: "Checkered", tortoise: "Tortoise shell", floral: "Floral", gems: "Gems & 3D",
};

export const ALL_SHAPES = [
  "Square", "Squoval", "Round", "Oval", "Almond", "Coffin", "Stiletto", "Lipstick", "Flare", "Edge", "Mountain Peak",
] as const;
export const ALL_LENGTHS = ["Extra Short", "Short", "Medium", "Long", "Extra Long"] as const;

export const NAIL_TYPES = ["Soft gel", "Acrylic", "ABS", "Gel strips", "Nail stickers", "Kit", "Accessory"] as const;

export const COLOR_FAMILIES: Record<string, string> = {
  Nude: "#E6C3B3", Pink: "#F2A7BB", Red: "#B3122E", Orange: "#E8833A", Yellow: "#F2CF5B", Green: "#6E9F7A", Blue: "#3E6FB0",
  Purple: "#8C6BC8", Brown: "#7A4B35", Black: "#1E1418", White: "#F7F3EE", Silver: "#C9CCD3", Gold: "#D4AF6A",
  Multi: "conic-gradient(#f2a7bb,#f2cf5b,#6e9f7a,#3e6fb0,#8c6bc8,#f2a7bb)",
};

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
