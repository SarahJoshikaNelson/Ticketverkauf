type Order = {
  id: string;
  customer: Customer;
  order: OrderContent;
};

type Customer = {
  firstName: string;
  lastName: string;
  mailAddress: string;
  password?: string;
  phoneNumber: string;
  schoolClass: string;
  isMale: boolean;
  street: string;
  streetNumber: string;
  zipCode: string;
  town: string;
};

type OrderContent = {
  status: "WAITING" | "PAID" | "CANCELLED" | "CONFIRMED" | "DONE";
  orderDate: Date;
  tickets: Ticket[];
  seats: Seat[];
};

export const TICKET_TYPES = ["STUDENT", "EXTERNAL", "GRADUATE"] as const;
type Ticket = {
  price: number;
  type: (typeof TICKET_TYPES)[number];
  id: string;
  isPhysical: boolean;
};

type Table = {
  name: string;
  room: string; // room name reference
  selectable: boolean;
  seats: Seat[];
  xposition: number;
  yposition: number;
  xlength: number;
  ylength: number;
  selected?: boolean;
};

type Seat = {
  id: string;
  price: number;
  xposition: number;
  yposition: number;
  xlength: number;
  ylength: number;
  table?: string; // table name reference
  tableName?: string; // table name from backend
  order?: string; // order reference (optional)
  taken?: boolean; // indicates if seat is already booked
  getTable?: () => Table | undefined; // method to get table information
};

type Layer = {
  name: string;
  level: number;
  picture?: string; // base64 encoded image
  rooms: Room[];
};

type Room = {
  name: string;
  layer: string; // layer name reference
  tables: Table[];
  xposition: number;
  yposition: number;
  xlength: number;
  ylength: number;
};

type LoginToken = {
  token: string;
};

type WaitingListSummary = {
  currentlyWaiting: number;
  inFrontOfSessionHolder: number;
  sessionId: string;
  isNew?: boolean;
};

export type {
  Order,
  Customer,
  OrderContent,
  Ticket,
  Layer,
  Room,
  Table,
  Seat,
  LoginToken,
  WaitingListSummary,
};
