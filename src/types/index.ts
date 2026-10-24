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

export type PaymentMethod = 'cod' | 'online' | 'card' | 'card_emi' | 'emi' | 'upi_mandate';

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
  upiId?: string;
  landmark?: string;
  deliveryZone?: 'chhuikhadan' | 'under_10km' | 'above_10km';
  distanceKm?: number;
}

export interface CustomerProfile {
  mobile: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  landmark?: string;
  upiId?: string;
  cart?: CartItem[];
  wishlist?: string[];
  createdAt?: string;
  lastLoginAt?: string;
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
    downPaymentAmount?: number;
    downPaymentPercent?: number;
    financedAmount?: number;
    providerNote: string;
    mandateUpiId?: string;
    mandateType?: string;
    mandateStatus?: string;
    creditCardBank?: string;
    cardLast4?: string;
  };
  razorpayPaymentId?: string;
  kistPeTransactionId?: string;
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
  deliveryChhuikhadanFee: number;
  deliveryUnder10kmFee: number;
  codMaxDistanceKm: number;
  freeDeliveryThreshold: number;
  isCodAvailable: boolean;
  isOnlinePaymentAvailable: boolean;
  isEmiAvailable: boolean;
  emiMinAmount: number;
  emiDownPaymentPercent: number;
  adminPin: string;
  // EMI / UPI Mandate Settings
  isCollectEmiAvailable?: boolean;
  collectUpiId?: string;
  collectAppName?: string;
  collectMerchantLink?: string;
  emiTenures?: number[];
  isUpiMandateAvailable?: boolean;
  upiMandateVpa?: string;
  upiMandateProvider?: string;
  // Card & Credit Card EMI Settings
  isCardPaymentAvailable?: boolean;
  isCreditCardEmiAvailable?: boolean;
  cardGatewayName?: string;
  paymentGatewayKeyId?: string;
  creditCardEmiMinAmount?: number;
  // Razorpay Gateway Settings
  razorpayEnabled?: boolean;
  razorpayKeyId?: string;
  // Kist Pe (किस्त पे) App Settings
  kistPeEnabled?: boolean;
  kistPeMerchantId?: string;
  kistPeUpiId?: string;
  kistPeMerchantLink?: string;
  kistPeAppName?: string;
  // Poster Barcode & App Download Public URL
  appPublicUrl?: string;
}
