export interface Product {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  stock: number;
  price: number;
}

export interface ProductOrder {
  id: number;
  productTitle: string;
  quantity: number;
  orderedAt: string;
  totalPrice: number;
}

export interface DigitalTicket {
  id: string;
  ticketType: string;
}

export interface CartItem extends Product {
  quantity: number;
}

/** Upgrade by ticket type and quantity (no specific ticket IDs). */
export interface UpgradeCartItem {
  type: 'upgrade';
  ticketType: string;
  quantity: number;
  pricePerUnit: number;
}

/** Unified completed order item (product or upgrade) from API. */
export interface CompletedOrderItem {
  type: 'product' | 'upgrade';
  id: number;
  title: string;
  quantity: number;
  orderedAt: string;
  totalPrice: number;
}

export type NotificationType = 'success' | 'error' | 'info';

export interface NotificationState {
  type: NotificationType;
  title: string;
  message: string;
}
