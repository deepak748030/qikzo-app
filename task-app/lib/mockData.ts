// Qizko grocery catalog — mock data (no backend yet).

const U = (id: string, w = 400) =>
  `https://images.unsplash.com/${id}?w=${w}&q=80&auto=format&fit=crop`;

export type Category = {
  id: string;
  name: string;
  image: string;
};

export type Product = {
  id: string;
  name: string;
  unit: string;
  price: number;
  mrp: number;
  categoryId: string;
  image: string;
  inStock: boolean;
};

export const categories: Category[] = [
  { id: 'all', name: 'All', image: U('photo-1542838132-92c53300491e', 200) },
  { id: 'fruits', name: 'Fruits', image: U('photo-1610832958506-aa56368176cf', 200) },
  { id: 'vegetables', name: 'Vegetables', image: U('photo-1540420773420-3366772f4999', 200) },
  { id: 'dairy', name: 'Dairy', image: U('photo-1628088062854-d1870b4553da', 200) },
  { id: 'bakery', name: 'Bakery', image: U('photo-1509440159596-0249088772ff', 200) },
  { id: 'snacks', name: 'Snacks', image: U('photo-1566478989037-eec170784d0b', 200) },
  { id: 'beverages', name: 'Beverages', image: U('photo-1600271886742-f049cd451bba', 200) },
  { id: 'staples', name: 'Staples', image: U('photo-1586201375761-83865001e31c', 200) },
];

export const products: Product[] = [
  { id: 'p1', name: 'Fresh Bananas', unit: '1 dozen', price: 49, mrp: 60, categoryId: 'fruits', image: U('photo-1571771894821-ce9b6c11b08e'), inStock: true },
  { id: 'p2', name: 'Red Apples', unit: '1 kg', price: 129, mrp: 160, categoryId: 'fruits', image: U('photo-1568702846914-96b305d2aaeb'), inStock: true },
  { id: 'p3', name: 'Alphonso Mango', unit: '1 kg', price: 199, mrp: 240, categoryId: 'fruits', image: U('photo-1553279768-865429fa0078'), inStock: true },
  { id: 'p4', name: 'Green Grapes', unit: '500 g', price: 79, mrp: 99, categoryId: 'fruits', image: U('photo-1599819177626-b1aae9a93ac7'), inStock: true },
  { id: 'p5', name: 'Fresh Tomato', unit: '1 kg', price: 39, mrp: 55, categoryId: 'vegetables', image: U('photo-1546470427-227df1e3c8d2'), inStock: true },
  { id: 'p6', name: 'Broccoli', unit: '500 g', price: 69, mrp: 90, categoryId: 'vegetables', image: U('photo-1459411552884-841db9b3cc2a'), inStock: true },
  { id: 'p7', name: 'Carrots', unit: '1 kg', price: 45, mrp: 60, categoryId: 'vegetables', image: U('photo-1582515073490-39981397c445'), inStock: true },
  { id: 'p8', name: 'Green Capsicum', unit: '500 g', price: 35, mrp: 50, categoryId: 'vegetables', image: U('photo-1563565375-f3fdfdbefa83'), inStock: false },
  { id: 'p9', name: 'Full Cream Milk', unit: '1 L', price: 66, mrp: 70, categoryId: 'dairy', image: U('photo-1563636619-e9143da7973b'), inStock: true },
  { id: 'p10', name: 'Farm Eggs', unit: '6 pcs', price: 59, mrp: 72, categoryId: 'dairy', image: U('photo-1582722872445-44dc5f7e3c8f'), inStock: true },
  { id: 'p11', name: 'Cheese Slices', unit: '200 g', price: 119, mrp: 145, categoryId: 'dairy', image: U('photo-1486297678162-eb2a19b0a32d'), inStock: true },
  { id: 'p12', name: 'Salted Butter', unit: '100 g', price: 54, mrp: 62, categoryId: 'dairy', image: U('photo-1589985270826-4b7bb135bc9d'), inStock: true },
  { id: 'p13', name: 'Brown Bread', unit: '400 g', price: 45, mrp: 55, categoryId: 'bakery', image: U('photo-1509440159596-0249088772ff'), inStock: true },
  { id: 'p14', name: 'Croissant', unit: '2 pcs', price: 89, mrp: 110, categoryId: 'bakery', image: U('photo-1555507036-ab1f4038808a'), inStock: true },
  { id: 'p15', name: 'Potato Chips', unit: '90 g', price: 30, mrp: 40, categoryId: 'snacks', image: U('photo-1566478989037-eec170784d0b'), inStock: true },
  { id: 'p16', name: 'Choco Cookies', unit: '250 g', price: 65, mrp: 80, categoryId: 'snacks', image: U('photo-1499636136210-6f4ee915583e'), inStock: true },
  { id: 'p17', name: 'Orange Juice', unit: '1 L', price: 99, mrp: 120, categoryId: 'beverages', image: U('photo-1600271886742-f049cd451bba'), inStock: true },
  { id: 'p18', name: 'Cold Coffee', unit: '200 ml', price: 49, mrp: 60, categoryId: 'beverages', image: U('photo-1517701604599-bb29b565090c'), inStock: true },
  { id: 'p19', name: 'Basmati Rice', unit: '5 kg', price: 549, mrp: 650, categoryId: 'staples', image: U('photo-1586201375761-83865001e31c'), inStock: true },
  { id: 'p20', name: 'Wheat Atta', unit: '5 kg', price: 269, mrp: 320, categoryId: 'staples', image: U('photo-1574323347407-f5e1ad6d020b'), inStock: true },
  { id: 'p21', name: 'Toor Dal', unit: '1 kg', price: 149, mrp: 180, categoryId: 'staples', image: U('photo-1599909533714-3e9eb1e3a3b8'), inStock: true },
  { id: 'p22', name: 'Strawberry', unit: '250 g', price: 99, mrp: 130, categoryId: 'fruits', image: U('photo-1464965911861-746a04b4bca6'), inStock: true },
  { id: 'p23', name: 'Onion', unit: '1 kg', price: 35, mrp: 48, categoryId: 'vegetables', image: U('photo-1518977956812-cd3dbadaaf31'), inStock: true },
  { id: 'p24', name: 'Curd', unit: '400 g', price: 40, mrp: 50, categoryId: 'dairy', image: U('photo-1488477181946-6428a0291777'), inStock: true },
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
