// src/utils/mockData.js

export const CATEGORIES = ["All", "Burgers", "Noodles", "Pizza", "Grills", "Salads", "Japanese"];

export const MOCK_SHOPS = [
  { id: "S001", name: "Burger Palace",  category: "Burgers",  rating: 4.8, reviews: 234, deliveryTime: "20-30", deliveryFee: 1.5, minOrder: 5,  emoji: "🍔", gradient: "from-orange-400 to-red-500",    open: true,  distance: "1.2 km", tags: ["Popular", "Fast"] },
  { id: "S002", name: "Noodle House",   category: "Noodles",  rating: 4.6, reviews: 189, deliveryTime: "25-35", deliveryFee: 1.0, minOrder: 4,  emoji: "🍜", gradient: "from-yellow-400 to-orange-500", open: true,  distance: "0.8 km", tags: ["Healthy"] },
  { id: "S003", name: "Pizza Corner",   category: "Pizza",    rating: 4.7, reviews: 156, deliveryTime: "30-40", deliveryFee: 2.0, minOrder: 8,  emoji: "🍕", gradient: "from-red-400 to-pink-500",     open: true,  distance: "2.1 km", tags: ["Popular"] },
  { id: "S004", name: "Sushi World",    category: "Japanese", rating: 4.9, reviews: 98,  deliveryTime: "35-45", deliveryFee: 2.5, minOrder: 10, emoji: "🍱", gradient: "from-blue-400 to-cyan-500",    open: false, distance: "3.0 km", tags: ["Premium"] },
  { id: "S005", name: "BBQ Garden",     category: "Grills",   rating: 4.5, reviews: 143, deliveryTime: "25-40", deliveryFee: 1.5, minOrder: 6,  emoji: "🍗", gradient: "from-amber-400 to-orange-600", open: true,  distance: "1.5 km", tags: ["New"] },
  { id: "S006", name: "Fresh Salads",   category: "Salads",   rating: 4.4, reviews: 87,  deliveryTime: "15-25", deliveryFee: 1.0, minOrder: 5,  emoji: "🥗", gradient: "from-green-400 to-emerald-500", open: true,  distance: "0.5 km", tags: ["Healthy", "Fast"] },
];

export const MOCK_MENU = {
  S001: {
    categories: ["All", "Burgers", "Sides", "Drinks"],
    items: [
      { id: "M001", name: "Classic Beef Burger",   desc: "Juicy beef patty, lettuce, tomato & cheese",   price: 7.5,  cat: "Burgers", emoji: "🍔", popular: true },
      { id: "M002", name: "Double Smash Burger",   desc: "Two smashed patties, special sauce, pickles",  price: 10.5, cat: "Burgers", emoji: "🍔", popular: true },
      { id: "M003", name: "Crispy Chicken Burger", desc: "Fried chicken fillet, coleslaw, honey mustard",price: 8.0,  cat: "Burgers", emoji: "🍗", popular: false },
      { id: "M004", name: "French Fries",          desc: "Golden crispy fries with house seasoning",     price: 3.0,  cat: "Sides",   emoji: "🍟", popular: true },
      { id: "M005", name: "Onion Rings",           desc: "Beer-battered crispy onion rings",             price: 3.5,  cat: "Sides",   emoji: "🧅", popular: false },
      { id: "M006", name: "Coke",                  desc: "330ml chilled can",                            price: 1.5,  cat: "Drinks",  emoji: "🥤", popular: false },
      { id: "M007", name: "Chocolate Milkshake",   desc: "Thick creamy chocolate shake",                 price: 4.5,  cat: "Drinks",  emoji: "🥛", popular: true },
    ],
  },
  S002: {
    categories: ["All", "Noodles", "Starters", "Drinks"],
    items: [
      { id: "M101", name: "Pad Thai",            desc: "Classic Thai rice noodles, egg & peanuts",      price: 6.0, cat: "Noodles",   emoji: "🍜", popular: true },
      { id: "M102", name: "Beef Noodle Soup",    desc: "Slow-cooked bone broth, flat noodles",          price: 5.5, cat: "Noodles",   emoji: "🍲", popular: true },
      { id: "M103", name: "Fried Egg Noodles",   desc: "Wok-fried egg noodles with vegetables",         price: 5.0, cat: "Noodles",   emoji: "🍝", popular: false },
      { id: "M104", name: "Spring Rolls (4pcs)", desc: "Crispy golden rolls with vegetables",           price: 4.0, cat: "Starters",  emoji: "🥢", popular: true },
      { id: "M105", name: "Thai Iced Tea",       desc: "Sweetened Thai iced tea with milk",             price: 2.5, cat: "Drinks",    emoji: "🧋", popular: false },
    ],
  },
  S003: {
    categories: ["All", "Pizza", "Sides", "Drinks"],
    items: [
      { id: "M201", name: "Margherita",        desc: "Tomato, mozzarella, fresh basil",         price: 9.5,  cat: "Pizza",  emoji: "🍕", popular: true },
      { id: "M202", name: "BBQ Chicken",       desc: "BBQ sauce, chicken, red onion, cheddar",  price: 11.0, cat: "Pizza",  emoji: "🍕", popular: true },
      { id: "M203", name: "Pepperoni",         desc: "Loaded pepperoni & mozzarella",           price: 10.5, cat: "Pizza",  emoji: "🍕", popular: false },
      { id: "M204", name: "Garlic Bread",      desc: "Toasted garlic butter sourdough",         price: 3.5,  cat: "Sides",  emoji: "🥖", popular: true },
      { id: "M205", name: "Coke",              desc: "330ml chilled can",                       price: 1.5,  cat: "Drinks", emoji: "🥤", popular: false },
      { id: "M206", name: "Water",             desc: "500ml mineral water",                     price: 1.0,  cat: "Drinks", emoji: "💧", popular: false },
      { id: "M207", name: "Orange Juice",      desc: "Fresh squeezed 350ml",                    price: 2.5,  cat: "Drinks", emoji: "🍊", popular: false },
    ],
  },
  S005: {
    categories: ["All", "Grills", "Sides", "Drinks"],
    items: [
      { id: "M301", name: "BBQ Chicken Half", desc: "Half chicken, char-grilled with BBQ sauce", price: 8.0,  cat: "Grills", emoji: "🍗", popular: true },
      { id: "M302", name: "Beef Ribs",        desc: "Slow-smoked tender beef ribs",              price: 14.0, cat: "Grills", emoji: "🥩", popular: true },
      { id: "M303", name: "Grilled Corn",     desc: "Butter & herb grilled corn",                price: 2.5,  cat: "Sides",  emoji: "🌽", popular: false },
      { id: "M304", name: "Steamed Rice",     desc: "Jasmine white rice",                        price: 1.5,  cat: "Sides",  emoji: "🍚", popular: false },
      { id: "M305", name: "Coke",             desc: "330ml chilled can",                         price: 1.5,  cat: "Drinks", emoji: "🥤", popular: false },
      { id: "M306", name: "Lemon Iced Tea",   desc: "Refreshing iced tea with lemon",            price: 2.0,  cat: "Drinks", emoji: "🧋", popular: false },
    ],
  },
  S006: {
    categories: ["All", "Salads", "Bowls"],
    items: [
      { id: "M401", name: "Caesar Salad",  desc: "Romaine, croutons, parmesan & caesar dressing", price: 6.5, cat: "Salads", emoji: "🥗", popular: true },
      { id: "M402", name: "Greek Salad",   desc: "Tomato, cucumber, olive, feta cheese",          price: 6.0, cat: "Salads", emoji: "🥗", popular: false },
      { id: "M403", name: "Protein Bowl",  desc: "Grilled chicken, quinoa, avocado, greens",      price: 8.5, cat: "Bowls",  emoji: "🥙", popular: true },
    ],
  },
};

export const MOCK_ORDERS = [
  {
    id: "ORD-1001", shopId: "S001", shopName: "Burger Palace", shopEmoji: "🍔",
    items: [{ name: "Classic Beef Burger", qty: 2, price: 7.5 }, { name: "French Fries", qty: 1, price: 3.0 }],
    subtotal: 18.0, deliveryFee: 1.5, total: 19.5,
    status: "delivered", date: "Feb 28, 2026", time: "10:30 AM",
    riderName: "Visal Sok", riderPhone: "017 111 222", address: "St. 271, Phnom Penh",
  },
  {
    id: "ORD-1002", shopId: "S002", shopName: "Noodle House", shopEmoji: "🍜",
    items: [{ name: "Pad Thai", qty: 1, price: 6.0 }, { name: "Spring Rolls (4pcs)", qty: 1, price: 4.0 }],
    subtotal: 10.0, deliveryFee: 1.0, total: 11.0,
    status: "delivered", date: "Feb 27, 2026", time: "12:15 PM",
    riderName: "Dina Phal", riderPhone: "017 333 444", address: "St. 271, Phnom Penh",
  },
  {
    id: "ORD-1003", shopId: "S003", shopName: "Pizza Corner", shopEmoji: "🍕",
    items: [{ name: "Margherita", qty: 1, price: 9.5 }, { name: "Garlic Bread", qty: 1, price: 3.5 }],
    subtotal: 13.0, deliveryFee: 2.0, total: 15.0,
    status: "delivering", date: "Feb 28, 2026", time: "2:00 PM",
    riderName: "Ratanak Lim", riderPhone: "017 555 666", address: "St. 271, Phnom Penh",
  },
];

export const PROMO_CODES = [
  { code: "WELCOME10", type: "percent", value: 10, minOrder: 5,  label: "10% off your order" },
  { code: "FREEDEL",   type: "freedel",  value: 0,  minOrder: 8,  label: "Free delivery" },
  { code: "SAVE2",     type: "fixed",    value: 2,  minOrder: 10, label: "$2 off $10+" },
];

export const ORDER_STATUSES = {
  pending:        { label: "Order Placed",   icon: "📋", color: "amber",  step: 1 },
  confirmed:      { label: "Confirmed",      icon: "✅", color: "blue",   step: 2 },
  preparing:      { label: "Preparing",      icon: "👨‍🍳", color: "violet", step: 3 },
  rider_assigned: { label: "Rider Assigned", icon: "🛵", color: "cyan",   step: 4 },
  delivering:     { label: "On the Way",     icon: "🛵", color: "orange", step: 5 },
  delivered:      { label: "Delivered",      icon: "🎉", color: "green",  step: 6 },
  cancelled:      { label: "Cancelled",      icon: "❌", color: "red",    step: 0 },
};