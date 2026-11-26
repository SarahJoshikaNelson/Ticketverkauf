# Shop — HTTP endpoints

Base path: **`/api/v2/shop`**.

Default class-level: **`Content-Type: application/json`**, **`Accept: application/json`**.

Many routes use the **JWT** (`JsonWebToken`) for the buyer email: claim **`email`**, else **`name`**.

---

## Products (public)

### `GET /api/v2/shop/products`

**Response:** `200` — list of product DTOs (`ProductManager.getAllProducts()`).

### `GET /api/v2/shop/products/{id}`

**Path:** `id` — `Long` product id.

**Response:** `200` product, `404` if missing.

---

## Orders and upgrades (JWT)

### `POST /api/v2/shop/order/{productId}?quantity=1`

**Path:** `productId` — `Long`.

**Query:** `quantity` — optional, default `1`.

**Auth:** JWT (email/name).

**Response:** `200` OK, `409` / `400` with `ErrorDTO { message }` on business errors.

---

### `POST /api/v2/shop/bulk-order`

**Auth:** JWT.

**Body:** `BulkOrderRequestDTO`

```json
{ "items": [ { "productId": 1, "quantity": 2 } ] }
```

**Response:** `200`, or `409` / `400` + `ErrorDTO`.

---

### `GET /api/v2/shop/my-orders`

**Auth:** JWT.

**Response:** `200` — user’s shop orders (shape from `ProductManager.getUserOrders`).

### `GET /api/v2/shop/my-completed-orders`

**Auth:** JWT.

**Response:** `200` — completed orders for success/history UI.

### `GET /api/v2/shop/my-upgradeable-counts`

**Auth:** JWT.

**Response:** `200` — map/counts of upgradeable tickets by type.

### `GET /api/v2/shop/my-tickets`

**Auth:** JWT.

**Response:** `200` — user’s digital tickets for upgrade UI.

---

### `POST /api/v2/shop/upgrade-ticket/{ticketId}`

**Path:** `ticketId` — `UUID`.

**Auth:** JWT.

**Response:** `200`, or `409` / `400` + `ErrorDTO`.

---

### `POST /api/v2/shop/upgrade-by-type`

**Auth:** JWT.

**Body:** `UpgradeByTypeRequestDTO`

| Field | Type | Notes |
|-------|------|--------|
| `ticketType` | string | e.g. `STUDENT`, `EXTERNAL`, `GRADUATE` (case-insensitive in code) |
| `quantity` | int | ≥ 1 |

**Response:** `200`, or `409` / `400` + `ErrorDTO`.

---

## Stripe (shop)

### `POST /api/v2/shop/create-checkout-session`

**Auth:** JWT (email used as shop customer email).

**Precondition:** `SettingManager.isStripeEnabled()` — else `403` + `ErrorDTO`.

**Body:** `ShopCheckoutRequestDTO`

| Field | Type | Notes |
|-------|------|--------|
| `email` | string | Present on DTO; **server overwrites** with JWT email when building cache |
| `items` | array or null | `{ productId, quantity }[]` |
| `upgrades` | array or null | `{ ticketType, quantity }[]` |
| `reservedTicketIds` | array or null | Usually **omit** on request — filled server-side when caching |

**Success:** `200` `{ "location": "<Stripe Checkout URL>" }`.

**Errors:** `409` stock/upgrade conflict (`ErrorDTO`), `500` cache/Stripe errors (reservations rolled back where coded).

**Stripe metadata set by server:**

| Key | Value |
|-----|--------|
| `order_cache_id` | UUID of persisted cart |
| `source` | `"shop"` |

---

### `POST /api/v2/shop/webhook`

**Purpose:** Optional dedicated shop webhook (same event shape as checkout webhook). Only processes events whose metadata **`source`** is **`shop`**.

**Body:** Same webhook DTO pattern as `CheckoutResource` (see [Stripe.endpoints.md](./Stripe.endpoints.md)).

If Stripe Dashboard points only to **`/api/v2/checkout/webhook`**, this route may never be called.

---

### `GET /api/v2/shop/checkout/session/{sessionId}`

**Purpose:** Shop success page — load Stripe session + cached cart.

**Path:** `sessionId` — Stripe session id.

**Response:** `200` JSON with `email`, `items`, `upgrades`, `paymentStatus`, `amountTotal`, `currency`.

---

## Shop settings (admin)

**Auth:** `@AdminOnly` (admin JWT).

### `GET /api/v2/shop/settings`

**Response:** `{ "mailEnabled": boolean }` (from setting `ShopMailEnabled`).

### `PUT /api/v2/shop/settings?mailEnabled=true|false`

**Query:** `mailEnabled` — boolean.

**Response:** `200`.

---

## Shop admin — products / orders

All **`@AdminOnly`**.

| Method | Path | Body / params | Purpose |
|--------|------|---------------|---------|
| `POST` | `/admin/products` | `ProductDTO` | Create or update product |
| `DELETE` | `/admin/products/{id}` | `id` Long | Delete product |
| `GET` | `/admin/orders` | — | List all shop orders |

After product mutations, stock is broadcast over **`ShopStockWebSocket`** (see implementation doc).
