export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: string;
  dietaryTags: string[]; // e.g. ["V", "VG", "GF", "DF"]
}

export interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
}

export interface OpeningHours {
  open: string;
  close: string;
  isClosed: boolean;
}

export interface RestaurantConfig {
  agentName: string;
  restaurantName: string;
  restaurantType: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  instagram: string;
  tone: string;
  personality: string;
  priceRange: string;
  reservations: string;
  reservationMethod: string;
  parking: string;
  seating: string;
  wifi: boolean;
  wifiPassword?: string;
  kidFriendly: boolean;
  petFriendly: string;
  wheelchairAccessible: boolean;
  currency: string;
  paymentMethods: string[];
  openingHours: {
    [key: string]: OpeningHours;
  };
  menu: MenuCategory[];
  specials: { name: string; description: string; price: string; period: string }[];
  signatureDishes: string[];
}

export const DEFAULT_CONFIG: RestaurantConfig = {
  agentName: "Bella",
  restaurantName: "The Roasted Bean",
  restaurantType: "cozy neighbourhood café",
  address: "123 Espresso Lane, Coffee City, CA 90210",
  phone: "(555) 123-4567",
  email: "hello@roastedbean.com",
  website: "www.roastedbean.com",
  instagram: "@roastedbean",
  tone: "warm and conversational",
  personality: "friendly, efficient, witty",
  priceRange: "$10–$25 per person",
  reservations: "Recommended for brunch, walk-ins welcome",
  reservationMethod: "Website or Phone",
  parking: "Free street parking available",
  seating: "Indoor + Outdoor patio",
  wifi: true,
  wifiPassword: "COFFEE_LOVER",
  kidFriendly: true,
  petFriendly: "Outdoor seating only",
  wheelchairAccessible: true,
  currency: "$",
  paymentMethods: ["Cash", "All major cards", "Apple Pay"],
  openingHours: {
    monday: { open: "08:00", close: "18:00", isClosed: false },
    tuesday: { open: "08:00", close: "18:00", isClosed: false },
    wednesday: { open: "08:00", close: "18:00", isClosed: false },
    thursday: { open: "08:00", close: "18:00", isClosed: false },
    friday: { open: "08:00", close: "20:00", isClosed: false },
    saturday: { open: "09:00", close: "20:00", isClosed: false },
    sunday: { open: "09:00", close: "16:00", isClosed: false },
  },
  menu: [
    {
      id: "cat1",
      name: "Coffee & Drinks",
      items: [
        { id: "i1", name: "Classic Latte", description: "Smooth espresso with steamed milk and a thin layer of foam.", price: "4.50", dietaryTags: [] },
        { id: "i2", name: "Cold Brew", description: "12-hour steeped specialty blend, served over ice.", price: "5.00", dietaryTags: [] },
      ],
    },
    {
      id: "cat2",
      name: "Brunch Mains",
      items: [
        { id: "i3", name: "Avocado Smash", description: "Poached eggs, feta, and sourdough with a hint of chili.", price: "16.00", dietaryTags: [] },
        { id: "i4", name: "Classic Benedict", description: "Two poached eggs on toasted English muffin with hollandaise.", price: "18.00", dietaryTags: [] },
      ],
    },
  ],
  specials: [
    { name: "Pumpkin Spice Latte", description: "Seasonal favorite with real pumpkin purée.", price: "5.50", period: "Fall Season" },
  ],
  signatureDishes: [
    "Avocado Smash — Our most popular brunch item for 5 years running.",
    "House Blend Cold Brew — Steeped for exactly 12 hours for peak smoothness.",
  ],
};
