export type CategoryId = string;

export interface Category {
  id: string;
  name: string;
  image?: string;
  icon?: string;
  itemCountLabel?: string;
  description?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  mrp: number;
  sellingPrice: number;
  discountPercent: number;
  sizes: string[];
  colors?: string[]; // Available colors e.g. ['Jet Black', 'Navy Blue', 'Wine Red']
  stock: number;
  description: string;
  images: string[];
  isFeatured: boolean;
  isNewArrival: boolean;
  rating: number;
  reviewsCount: number;
  tags?: string[];
  createdAt: string;
}

export interface CartItem {
  id: string; // unique key: `${productId}-${selectedSize}-${selectedColor || 'def'}`
  productId: string;
  product: Product;
  selectedSize: string;
  selectedColor?: string;
  quantity: number;
}

export type PaymentMethod = 'cod' | 'online' | 'emi' | 'upi_mandate';

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Packed'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled';

export interface CustomerAddress {
  name: string;
  mobile: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  image: string;
  selectedSize: string;
  selectedColor?: string;
  quantity: number;
  unitPrice: number;
  unitMrp: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  customer: CustomerAddress;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: 'Pending' | 'Paid' | 'Failed';
  orderStatus: OrderStatus;
  notes?: string;
  emiDetails?: {
    tenure: string;
    monthlyInstallment: number;
    providerNote: string;
    mandateUpiId?: string;
    mandateType?: 'Collect App' | 'UPI AutoPay' | 'BharatPe' | 'General BNPL';
    mandateStatus?: string;
  };
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  offerText: string;
  image: string;
  categoryId?: CategoryId;
  isEnabled: boolean;
}

export interface StoreSettings {
  storeName: string;
  storeTagline: string;
  storeAddress: string;
  whatsappNumber: string;
  supportPhone: string;
  deliveryCharges: number;
  freeDeliveryThreshold: number;
  isCodAvailable: boolean;
  isOnlinePaymentAvailable: boolean;
  isEmiAvailable: boolean;
  emiMinAmount: number;
  adminPin: string;
  // Collect App / UPI Mandate AutoPay Settings
  isCollectEmiAvailable?: boolean;
  collectUpiId?: string;
  collectAppName?: string;
  collectMerchantLink?: string;
  emiTenures?: number[];
  isUpiMandateAvailable?: boolean;
  upiMandateVpa?: string;
  upiMandateProvider?: string;
}
