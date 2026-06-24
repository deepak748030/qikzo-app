// Qizko grocery catalog — mock data (no backend yet).

export type Category = {
  id: string;
  name: string;
  emoji: string;
};

export type Product = {
  id: string;
  name: string;
  unit: string;
  price: number;
  mrp: number;
  categoryId: string;
  emoji: string;
  inStock: boolean;
};

export const categories: Category[] = [
  { id: 'all', name: 'All', emoji: '🛒' },
  { id: 'fruits', name: 'Fruits', emoji: '🍎' },
  { id: 'vegetables', name: 'Vegetables', emoji: '🥦' },
  { id: 'dairy', name: 'Dairy', emoji: '🥛' },
  { id: 'bakery', name: 'Bakery', emoji: '🍞' },
  { id: 'snacks', name: 'Snacks', emoji: '🍪' },
  { id: 'beverages', name: 'Beverages', emoji: '🧃' },
  { id: 'staples', name: 'Staples', emoji: '🌾' },
];

export const products: Product[] = [
  { id: 'p1', name: 'Fresh Bananas', unit: '1 dozen', price: 49, mrp: 60, categoryId: 'fruits', emoji: '🍌', inStock: true },
  { id: 'p2', name: 'Red Apples', unit: '1 kg', price: 129, mrp: 160, categoryId: 'fruits', emoji: '🍎', inStock: true },
  { id: 'p3', name: 'Alphonso Mango', unit: '1 kg', price: 199, mrp: 240, categoryId: 'fruits', emoji: '🥭', inStock: true },
  { id: 'p4', name: 'Green Grapes', unit: '500 g', price: 79, mrp: 99, categoryId: 'fruits', emoji: '🍇', inStock: true },
  { id: 'p5', name: 'Fresh Tomato', unit: '1 kg', price: 39, mrp: 55, categoryId: 'vegetables', emoji: '🍅', inStock: true },
  { id: 'p6', name: 'Broccoli', unit: '500 g', price: 69, mrp: 90, categoryId: 'vegetables', emoji: '🥦', inStock: true },
  { id: 'p7', name: 'Carrots', unit: '1 kg', price: 45, mrp: 60, categoryId: 'vegetables', emoji: '🥕', inStock: true },
  { id: 'p8', name: 'Green Capsicum', unit: '500 g', price: 35, mrp: 50, categoryId: 'vegetables', emoji: '🫑', inStock: false },
  { id: 'p9', name: 'Full Cream Milk', unit: '1 L', price: 66, mrp: 70, categoryId: 'dairy', emoji: '🥛', inStock: true },
  { id: 'p10', name: 'Farm Eggs', unit: '6 pcs', price: 59, mrp: 72, categoryId: 'dairy', emoji: '🥚', inStock: true },
  { id: 'p11', name: 'Cheese Slices', unit: '200 g', price: 119, mrp: 145, categoryId: 'dairy', emoji: '🧀', inStock: true },
  { id: 'p12', name: 'Salted Butter', unit: '100 g', price: 54, mrp: 62, categoryId: 'dairy', emoji: '🧈', inStock: true },
  { id: 'p13', name: 'Brown Bread', unit: '400 g', price: 45, mrp: 55, categoryId: 'bakery', emoji: '🍞', inStock: true },
  { id: 'p14', name: 'Croissant', unit: '2 pcs', price: 89, mrp: 110, categoryId: 'bakery', emoji: '🥐', inStock: true },
  { id: 'p15', name: 'Potato Chips', unit: '90 g', price: 30, mrp: 40, categoryId: 'snacks', emoji: '🍟', inStock: true },
  { id: 'p16', name: 'Choco Cookies', unit: '250 g', price: 65, mrp: 80, categoryId: 'snacks', emoji: '🍪', inStock: true },
  { id: 'p17', name: 'Orange Juice', unit: '1 L', price: 99, mrp: 120, categoryId: 'beverages', emoji: '🧃', inStock: true },
  { id: 'p18', name: 'Cold Coffee', unit: '200 ml', price: 49, mrp: 60, categoryId: 'beverages', emoji: '☕', inStock: true },
  { id: 'p19', name: 'Basmati Rice', unit: '5 kg', price: 549, mrp: 650, categoryId: 'staples', emoji: '🍚', inStock: true },
  { id: 'p20', name: 'Wheat Atta', unit: '5 kg', price: 269, mrp: 320, categoryId: 'staples', emoji: '🌾', inStock: true },
  { id: 'p21', name: 'Toor Dal', unit: '1 kg', price: 149, mrp: 180, categoryId: 'staples', emoji: '🫘', inStock: true },
  { id: 'p22', name: 'Strawberry', unit: '250 g', price: 99, mrp: 130, categoryId: 'fruits', emoji: '🍓', inStock: true },
  { id: 'p23', name: 'Onion', unit: '1 kg', price: 35, mrp: 48, categoryId: 'vegetables', emoji: '🧅', inStock: true },
  { id: 'p24', name: 'Curd', unit: '400 g', price: 40, mrp: 50, categoryId: 'dairy', emoji: '🥣', inStock: true },
];

export type OrderStatus = 'Placed' | 'Packed' | 'Out for delivery' | 'Delivered';

export type Order = {
  id: string;
  date: string;
  items: number;
  total: number;
  status: OrderStatus;
};

export const mockOrders: Order[] = [
  { id: 'QZ1042', date: '24 Jun 2026, 10:20 AM', items: 6, total: 642, status: 'Out for delivery' },
  { id: 'QZ1038', date: '21 Jun 2026, 06:45 PM', items: 3, total: 218, status: 'Delivered' },
  { id: 'QZ1031', date: '17 Jun 2026, 09:10 AM', items: 9, total: 1124, status: 'Delivered' },
];

export function getProductById(id: string) {
  return products.find((p) => p.id === id);
}
