// Types mirroring docs/SPEC.md section 5 "Admin". All amounts are integer piastres.
// Fields the spec does not pin down are optional here and listed in the README.

export interface FieldError {
  field: string;
  code: "required" | "invalid";
}

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: string;
  permissions: string[];
}

export interface Settings {
  marketOpen: boolean;
  storeClosed: boolean;
  tolerancePct: number;
  paidPeriodMinutes: number;
  kycEnabled: boolean;
  requireKycDocPerOrder: boolean;
  requireEmailOtp: boolean;
  requireStock: boolean;
  showOutOfStockHome: boolean;
  showOutOfStockShop: boolean;
  spreadVisible: boolean;
  deliveryDaysVisible: boolean;
  branchPickup: boolean;
  /** Cashback per gram when GoldGram buys back a piece of a brand it sells: original packaging with the invoice, and opened. */
  sellCashbackSealedPiastres: number;
  sellCashbackOpenedPiastres: number;
}

export interface MasterPrice {
  buyPiastres: number;
  spreadPiastres: number;
  sellPiastres: number;
}

/** `GET /prices`: only the parts the dashboard shows. */
export interface PriceBoard {
  master: MasterPrice;
  karats: { karat: number; buyPiastres: number; sellPiastres: number; changePct: number }[];
  silver: MasterPrice;
  updatedAt: string;
  /** Whether an order would be accepted now: the switches, and market hours when enforced. */
  trading: "open" | "paused" | "closed";
}

export interface PriceHistory {
  stats: {
    currentSellPiastres: number;
    changePiastres: number;
    changePct: number;
    highPiastres: number;
    lowPiastres: number;
    rangePiastres: number;
  };
  chart: number[];
  items: {
    previousSellPiastres: number;
    newSellPiastres: number;
    changePiastres: number;
    changedAt: string;
  }[];
  page: number;
  pageSize: number;
  total: number;
}

export interface Overview {
  master: { buyPiastres: number; sellPiastres: number; lastChangePiastres: number };
  awaitingVerification: number;
  withPriceDifference: number;
  kycQueue: number;
  refundsToApprove: number;
  attention: {
    id: number;
    reference: string;
    paymentMethodName: string;
    paymentMethodNameAr?: string;
    quotedTotalPiastres: number;
    overTolerance: boolean;
    differencePiastres: number;
    differencePct: number;
  }[];
}

export type OrderStatus =
  | "initiated"
  | "pending"
  | "processing"
  | "shipping"
  | "ready"
  | "completed"
  | "cancelled"
  | "refund";

export type Fulfilment = "storage" | "branch" | "delivery";

export type OrderTab =
  | "all"
  | "initiated"
  | "pending"
  | "diff"
  | "processing"
  | "pickup"
  | "delivery"
  | "completed"
  | "cancelled"
  | "refund";

export interface OrderRow {
  id: number;
  reference: string;
  customerName: string;
  paymentMethodName: string;
  paymentMethodNameAr?: string;
  feePiastres: number;
  subtotalPiastres: number;
  shippingPiastres: number;
  initialPiastres: number;
  discountPiastres: number;
  discountName: string | null;
  quotedTotalPiastres: number;
  live: boolean;
  repricedTotalPiastres: number | null;
  differencePiastres: number | null;
  differencePct: number | null;
  overTolerance: boolean;
  fulfilment: Fulfilment;
  zoneName: string | null;
  zoneNameAr?: string | null;
  status: OrderStatus;
  refunded: boolean;
  createdAt: string;
}

export interface OrderList {
  counts: Record<OrderTab, number>;
  items: OrderRow[];
  total: number;
  page: number;
  pageSize: number;
}

/** `GET /admin/orders/:id` "everything, with items and events": the extra fields are assumed. */
export interface OrderDetail extends OrderRow {
  email?: string | null;
  phone?: string | null;
  nationalId?: string | null;
  /** When the customer sent their payment proof; the picture is at `/api/admin/orders/:id/proof`. */
  proofUploadedAt?: string | null;
  /** Every transfer picture, oldest first, with the order total each one paid up to. */
  kycDocument?: boolean;
  proofs?: { id: number; uploadedAt: string; forTotalPiastres: number | null }[];
  /** What the transfers cover; null before the first picture. */
  paidPiastres?: number | null;
  remainingPiastres?: number;
  street?: string | null;
  apartment?: string | null;
  governorate?: string | null;
  governorateNameEn?: string;
  governorateNameAr?: string;
  deliveryAddress?: string | null;
  notes?: string | null;
  items: {
    nameEn: string;
    nameAr: string;
    weightGrams?: number;
    karat?: number;
    qty: number;
    unitMetalPiastres: number;
    unitLaborPiastres: number;
    unitPricePiastres: number;
    lineTotalPiastres: number;
  }[];
  events: {
    text?: string | null;
    action?: string | null;
    status?: string | null;
    note?: string | null;
    /** The administrator's email, or "system" for the customer placing the order. */
    actor?: string | null;
    createdAt: string;
  }[];
}

export type AccountState = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export interface CustomerRow {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  nationality: string;
  email: string;
  mobile: string | null;
  account: AccountState;
  kyc: string;
  /** `YYYY-MM-DD`: entered by staff, else read from the national ID. */
  dateOfBirth: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface CustomerList {
  counts: { total: number; active: number; inactive: number; suspended: number; kycPending: number };
  items: CustomerRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CustomerDetail extends CustomerRow {
  nationalId: string | null;
  /** Which document `nationalId` is; null when there is none. */
  idType: "national_id" | "passport" | null;
  orders: {
    id: number;
    reference: string;
    totalPiastres: number;
    fulfilment: Fulfilment;
    status: OrderStatus;
    refunded: boolean;
    createdAt: string;
  }[];
  /** `totalSpentPiastres` counts orders whose payment is verified and that were not cancelled or refunded. */
  stats: { totalOrders: number; totalSpentPiastres: number };
  kycHistory: { text: string; adminName: string; createdAt: string }[];
}

export interface Category {
  id: number;
  nameEn: string;
  nameAr: string;
  slug: string;
  active: boolean;
}

export interface ProductType {
  id: number;
  nameEn: string;
  nameAr: string;
  master: "gold" | "silver";
  active: boolean;
}

export interface Manufacturer {
  id: number;
  nameEn: string;
  nameAr: string;
  description: string;
  active: boolean;
}

export interface Product {
  id: number;
  nameEn: string;
  nameAr: string;
  categoryId: number;
  typeId: number;
  manufacturerId: number;
  categoryName: string;
  typeName: string;
  manufacturerName: string;
  categoryNameAr?: string;
  typeNameAr?: string;
  manufacturerNameAr?: string;
  karat: number;
  weightGrams: number;
  stock: number;
  laborPiastres: number;
  active: boolean;
  priceTodayPiastres: number;
  cashback: {
    withPackagingPiastres: number;
    withoutPackagingPiastres: number;
    laborPiastres: number;
    valid: boolean;
  };
  descriptionEn: string;
  descriptionAr: string;
  /** Its photos, first one first: `/api/products/:id/images/:imageId`. */
  imageIds: number[];
  createdAt: string;
  updatedAt: string;
}

export interface DiscountRule {
  id: number;
  nameEn: string;
  nameAr: string | null;
  target: "labor" | "shipping";
  type: "percent" | "fixed";
  /** A percentage (≤ 100) or piastres, by `type`. */
  value: number;
  code: string;
  minCartPiastres: number;
  validFrom: string;
  validTo: string | null;
  enabled: boolean;
  status: "Active" | "Scheduled" | "Inactive";
}

export interface PaymentMethod {
  id: number;
  nameEn: string;
  nameAr: string;
  description?: string | null;
  fixedFeePiastres: number;
  percentFee: number;
  proofRequired: boolean;
  window: string;
  active: boolean;
  /** Where customers send the money (shown after ordering and in the emails). */
  payTo: string;
}

export interface Zone {
  id: number;
  nameEn: string;
  nameAr: string;
  costPiastres: number;
  active: boolean;
}

export interface DeliveryMethod {
  id: number;
  nameEn: string;
  nameAr: string;
  zoneId: number;
  /** Assumed: the spec lists only `zoneId`. Looked up in the zones list when absent. */
  zoneName?: string;
  estimatedDays: number;
  additionalCostPiastres: number;
  /** Assumed: see the README. */
  zoneCostPiastres?: number;
  totalCostPiastres?: number;
  active: boolean;
}

export interface Branch {
  id: number;
  nameEn: string;
  nameAr: string;
  city: string;
  state: string;
  phone: string;
  mapPin: string;
  active: boolean;
}

export interface Administrator {
  id: number;
  name: string;
  nationality: string;
  email: string;
  phone: string;
  roleId: number;
  roleName: string;
  status: "Active" | "Inactive" | "Suspended";
  lastLoginAt: string | null;
}

export interface Role {
  id: number;
  name: string;
  description?: string | null;
  builtIn: boolean;
  permissions: string[];
}

/** One line of the system log (`/admin/logs`). `source` and `id` together name it. */
export interface LogEntry {
  source: "message" | "order" | "kyc" | "price";
  id: number;
  createdAt: string;
  summary: string;
  actor: string;
  orderId: number | null;
  customerId: number | null;
  details: { label: string; value: string }[];
}

export interface LogList {
  items: LogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

/** `GET /admin/sell-requests` items: a customer's request to sell gold to GoldGram. */
export interface SellRequest {
  id: number;
  reference: string;
  status: "new" | "contacted" | "completed" | "cancelled";
  kind: "bar" | "coin";
  karat: number;
  weightGrams: number;
  qty: number;
  /** The product sold back when it is a brand GoldGram sells; null for another brand. */
  productId: number | null;
  /** That brand's name; empty for another brand. */
  brand: string;
  cashbackGramPiastres: number;
  condition: "sealed_invoice" | "sealed" | "opened";
  handover: "branch" | "courier";
  payout: "cash" | "instapay" | "bank";
  name: string;
  mobile: string;
  email: string;
  notes: string | null;
  gramPiastres: number;
  estimatePiastres: number;
  userId: number | null;
  locale: "en" | "ar";
  createdAt: string;
  updatedAt: string;
}

export interface SellRequestList {
  items: SellRequest[];
  total: number;
  page: number;
  pageSize: number;
}

export type ArticleType = "financial" | "educational" | "news" | "guide";

export interface AdminArticle {
  id: number;
  titleEn: string;
  titleAr: string;
  type: ArticleType;
  bodyEn: string;
  bodyAr: string;
  published: boolean;
  publishedAt: string;
  sortOrder: number;
  imageIds: number[];
}

export interface AdminFaqItem {
  id: number;
  questionEn: string;
  questionAr: string;
  answerEn: string;
  answerAr: string;
  active: boolean;
  sortOrder: number;
}
