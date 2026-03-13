// E-commerce Type Definitions for SikaRemit Mobile Applications

import { User } from './index';

// Enums
export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum FulfillmentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  READY_FOR_PICKUP = 'ready_for_pickup',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  RETURNED = 'returned',
  CANCELLED = 'cancelled',
}

export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  OUT_OF_STOCK = 'out_of_stock',
  DISCONTINUED = 'discontinued',
}

// Core E-commerce Interfaces
export interface Category {
  id: string;
  name: string;
  description?: string;
  parent_id?: string;
  image_url?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  image_url: string;
  thumbnail_url?: string;
  alt_text?: string;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface Inventory {
  id: string;
  product_id: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  low_stock_threshold: number;
  is_trackable: boolean;
  last_updated: string;
  location?: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  value: string;
  price_modifier: number;
  sku?: string;
  quantity: number;
  is_available: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  short_description?: string;
  sku?: string;
  barcode?: string;
  price: number;
  compare_price?: number;
  cost_price?: number;
  category: Category;
  store: Store;
  images: ProductImage[];
  inventory: Inventory;
  variants: ProductVariant[];
  tags: string[];
  is_featured: boolean;
  is_available: boolean;
  status: ProductStatus;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  seo_title?: string;
  seo_description?: string;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: string;
  merchant: User;
  name: string;
  description?: string;
  logo_url?: string;
  banner_url?: string;
  contact_email: string;
  contact_phone: string;
  address: Address;
  business_hours?: BusinessHours;
  social_links?: SocialLinks;
  is_active: boolean;
  is_verified: boolean;
  rating: number;
  total_reviews: number;
  total_products: number;
  total_orders: number;
  created_at: string;
  updated_at: string;
}

export interface Address {
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

export interface BusinessHours {
  monday?: TimeSlot;
  tuesday?: TimeSlot;
  wednesday?: TimeSlot;
  thursday?: TimeSlot;
  friday?: TimeSlot;
  saturday?: TimeSlot;
  sunday?: TimeSlot;
}

export interface TimeSlot {
  open: string; // HH:MM format
  close: string; // HH:MM format
  is_closed: boolean;
}

export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  website?: string;
}

// Order Management Interfaces
export interface OrderItem {
  id: string;
  order_id: string;
  product: Product;
  variant?: ProductVariant;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: FulfillmentStatus;
  tracking_number?: string;
  shipping_carrier?: string;
  shipped_at?: string;
  delivered_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ShippingAddress {
  first_name: string;
  last_name: string;
  company?: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone?: string;
}

export interface BillingAddress extends ShippingAddress {}

export interface PaymentInfo {
  method: 'wallet' | 'card' | 'bank_transfer' | 'mobile_money';
  status: PaymentStatus;
  amount: number;
  currency: string;
  transaction_id?: string;
  payment_date?: string;
  gateway_response?: any;
}

export interface Order {
  id: string;
  order_number: string;
  customer: User;
  store: Store;
  items: OrderItem[];
  status: OrderStatus;
  payment_status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  shipping_address: ShippingAddress;
  billing_address?: BillingAddress;
  payment_info: PaymentInfo;
  subtotal: number;
  shipping_cost: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  notes?: string;
  customer_notes?: string;
  tracking_number?: string;
  shipping_carrier?: string;
  estimated_delivery_date?: string;
  delivered_at?: string;
  cancelled_at?: string;
  refund_amount?: number;
  refund_reason?: string;
  created_at: string;
  updated_at: string;
}

// Cart and Wishlist Interfaces
export interface CartItem {
  id: string;
  product: Product;
  variant?: ProductVariant;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_available: boolean;
  stock_quantity: number;
  added_at: string;
  updated_at: string;
}

export interface Cart {
  id: string;
  customer: User;
  items: CartItem[];
  subtotal: number;
  tax_amount: number;
  shipping_cost: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  item_count: number;
  is_empty: boolean;
  created_at: string;
  updated_at: string;
}

export interface WishlistItem {
  id: string;
  product: Product;
  added_at: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface Wishlist {
  id: string;
  customer: User;
  items: WishlistItem[];
  item_count: number;
  created_at: string;
  updated_at: string;
}

// Analytics and Reporting Interfaces
export interface SalesAnalytics {
  period: string;
  total_orders: number;
  total_revenue: number;
  total_customers: number;
  average_order_value: number;
  top_products: Array<{
    product: Product;
    quantity_sold: number;
    revenue: number;
  }>;
  revenue_by_category: Array<{
    category: Category;
    revenue: number;
    order_count: number;
  }>;
}

export interface InventoryAnalytics {
  total_products: number;
  in_stock_products: number;
  low_stock_products: number;
  out_of_stock_products: number;
  total_value: number;
  inventory_turnover: number;
  stock_alerts: Array<{
    product: Product;
    alert_type: 'low_stock' | 'out_of_stock' | 'overstock';
    message: string;
  }>;
}

// API Request/Response Interfaces
export interface ProductListRequest {
  store_id?: string;
  category_id?: string;
  search?: string;
  min_price?: number;
  max_price?: number;
  sort_by?: 'name' | 'price' | 'created_at' | 'popularity';
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

export interface ProductListResponse {
  products: Product[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface OrderListRequest {
  store_id?: string;
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  fulfillment_status?: FulfillmentStatus;
  customer_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  sort_by?: 'created_at' | 'total_amount' | 'status';
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

export interface OrderListResponse {
  orders: Order[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
  summary?: {
    total_revenue: number;
    total_orders: number;
    pending_orders: number;
    shipped_orders: number;
  };
}

export interface CreateOrderRequest {
  customer_id: string;
  items: Array<{
    product_id: string;
    variant_id?: string;
    quantity: number;
  }>;
  shipping_address: ShippingAddress;
  billing_address?: BillingAddress;
  payment_method: string;
  notes?: string;
  customer_notes?: string;
}

export interface UpdateOrderRequest {
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  fulfillment_status?: FulfillmentStatus;
  tracking_number?: string;
  shipping_carrier?: string;
  notes?: string;
}

export interface CreateProductRequest {
  name: string;
  description: string;
  short_description?: string;
  sku?: string;
  barcode?: string;
  price: number;
  compare_price?: number;
  cost_price?: number;
  category_id: string;
  store_id: string;
  tags?: string[];
  is_featured?: boolean;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  seo_title?: string;
  seo_description?: string;
  initial_stock?: number;
  low_stock_threshold?: number;
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  id: string;
  status?: ProductStatus;
}

// Service Interfaces for Mobile Apps
export interface ProductService {
  getProducts(request: ProductListRequest): Promise<ProductListResponse>;
  getProduct(id: string): Promise<Product>;
  createProduct(request: CreateProductRequest): Promise<Product>;
  updateProduct(request: UpdateProductRequest): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  uploadProductImage(productId: string, imageUri: string, isPrimary?: boolean): Promise<ProductImage>;
  deleteProductImage(productId: string, imageId: string): Promise<void>;
}

export interface OrderService {
  getOrders(request: OrderListRequest): Promise<OrderListResponse>;
  getOrder(id: string): Promise<Order>;
  createOrder(request: CreateOrderRequest): Promise<Order>;
  updateOrder(id: string, request: UpdateOrderRequest): Promise<Order>;
  cancelOrder(id: string, reason?: string): Promise<void>;
  processRefund(orderId: string, amount: number, reason: string): Promise<Order>;
}

export interface InventoryService {
  getInventory(productId?: string): Promise<Inventory[]>;
  updateInventory(productId: string, quantity: number, location?: string): Promise<Inventory>;
  bulkUpdateInventory(updates: Array<{ productId: string; quantity: number }>): Promise<void>;
  getLowStockAlerts(): Promise<Array<{ product: Product; alert_type: string; message: string }>>;
}

export interface CartService {
  getCart(): Promise<Cart>;
  addToCart(productId: string, quantity?: number, variantId?: string): Promise<CartItem>;
  updateCartItem(itemId: string, quantity: number): Promise<Cart>;
  removeFromCart(itemId: string): Promise<Cart>;
  clearCart(): Promise<void>;
  moveToWishlist(itemId: string): Promise<void>;
}

export interface WishlistService {
  getWishlist(): Promise<Wishlist>;
  addToWishlist(productId: string): Promise<WishlistItem>;
  removeFromWishlist(itemId: string): Promise<Wishlist>;
  moveToCart(itemId: string): Promise<void>;
  clearWishlist(): Promise<void>;
}
