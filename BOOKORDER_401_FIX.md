# Non-Student Authentication Fix (401/500 Errors)

## Problems

### Problem 1: BookOrder Returns 401
When non-student users (using email/password authentication) tried to book orders, they would always receive a 401 Unauthorized error, even with a valid token stored in `sessionStorage`.

### Problem 2: Orders List Login Returns 500
When non-student users tried to view their orders (bestellungen ansehen) with correct credentials, the login would succeed but fetching orders would return a 500 error.

### Problem 3: JWT Signing Error (SRJWT05009)
When non-student users tried to login, the server would throw a `JwtSignatureException` with error `SRJWT05009` due to missing RSA key files and incorrect protocol prefixes in the configuration.

## Root Causes

### Issues 1 & 2: KeycloakBearerInterceptor
Both issues were caused by the **KeycloakBearerInterceptor** in the client applications:

1. The `KeycloakBearerInterceptor` was configured to automatically add Bearer tokens to **all** HTTP requests
2. When a non-student user (not logged in via Keycloak) made requests to:
   - `/api/v2/reservation/bookOrder` (booking tickets)
   - `/api/v2/user/login` (logging in)
   - `/api/v2/order/all/{email}/{token}` (fetching orders)
3. The interceptor would still attempt to add a Bearer token (even if invalid or missing)
4. This invalid Keycloak token would cause the backend's OIDC/JWT validation to reject the request
5. The request never reached the endpoint methods that check for tokens in the request body or path parameters

### Issue 3: Missing JWT Keys and Configuration
The JWT signing for non-student authentication was failing because:
1. The RSA private/public key files (`rsaPrivateKey.pem` and `publicKey.pem`) were missing from the resources directory
2. The configuration file had incorrect paths without the `classpath:` protocol prefix
3. This caused a `MalformedURLException` when trying to sign JWT tokens for non-student users

## Solution

### Frontend Changes

#### Order Client (`apps/Client/Order/src/app/app.config.ts`)
Added the `/api/v2/reservation/bookOrder` endpoint to the `bearerExcludedUrls` list:

```typescript
bearerExcludedUrls: ['/api/v2/reservation/bookOrder']
```

#### Web Client (`apps/Client/Web/src/app/app.config.ts`)
Added all non-student authentication endpoints to the `bearerExcludedUrls` list:

```typescript
bearerExcludedUrls: [
  '/api/v2/user/login',
  '/api/v2/user/register',
  '/api/v2/order/all'
]
```

These exclusions prevent the KeycloakBearerInterceptor from adding a Bearer token to non-student authentication requests, allowing users to authenticate using:
- Tokens in the request body (for bookOrder)
- Tokens in path parameters (for fetchOrders)

### Backend Changes

#### BookingResource (`apps/Server/service/src/main/java/at/htlleonding/api/BookingResource.java`)
Enhanced the token validation logic in `bookOrder` method to properly handle empty strings:

```java
// Check if token is provided and not empty
if (reservation.token() != null && !reservation.token().isEmpty() 
    && !userManager.checkToken(reservation.customer().mailAddress(), reservation.token())) {
    log.info("Invalid token");
    return Response.ok("Invalid access token.").status(401).build();
}
```

#### OrderResource (`apps/Server/service/src/main/java/at/htlleonding/api/OrderResource.java`)
Enhanced the token validation logic in `getOrders` method to properly handle empty strings:

```java
// Check if token is provided and not empty
if (token != null && !token.isEmpty()) {
    if (!userManager.checkToken(email, token)) {
        return Response.ok("Invalid access token.").status(401).build();
    }
} else {
    return Response.ok("No access token provided.").status(401).build();
}
```

#### Application Properties (`apps/Server/service/src/main/resources/application.properties`)
Fixed the JWT key file paths to include the `classpath:` protocol prefix:

```properties
mp.jwt.verify.publickey.location=classpath:/publicKey.pem
smallrye.jwt.sign.key.location=classpath:/rsaPrivateKey.pem
```

#### Generated RSA Keys
Created the required RSA key pair for JWT signing:
- **Private Key**: `apps/Server/service/src/main/resources/rsaPrivateKey.pem` (2048-bit RSA)
- **Public Key**: `apps/Server/service/src/main/resources/publicKey.pem` (extracted from private key)

These keys are used to sign and verify JWT tokens for non-student authentication.

These changes ensure that:
- `null` tokens are allowed (for backwards compatibility with student auth)
- Empty string tokens are allowed (when no token is stored)
- Only non-empty tokens are validated against the token registry
- JWT signing works correctly with proper key configuration

## How It Works Now

### Student Authentication Flow
1. Student logs in via Keycloak (LDAP)
2. KeycloakBearerInterceptor adds Bearer token to requests (except excluded URLs)
3. Backend validates JWT token and uses `context.getUserPrincipal()`

### Non-Student Authentication Flow

#### Booking Tickets (Order Client)
1. User fills in personal data with email and password
2. User registers/logs in automatically
3. Token is stored in `sessionStorage` as `non-student-auth-token`
4. Token is sent in the request body for `/bookOrder`
5. No Bearer token is added by the interceptor (excluded URL)
6. Backend validates the token from the request body using `userManager.checkToken()`

#### Viewing Orders (Web Client)
1. User enters email and password on orders page
2. Login request to `/api/v2/user/login` (excluded from Bearer token)
3. Server signs a JWT token using the RSA private key
4. Token is stored in `localStorage` as `non-student-auth-token`
5. Email is stored in `localStorage` as `non-student-auth-email`
6. Fetch orders request to `/api/v2/order/all/{email}/{token}` (excluded from Bearer token)
7. Backend validates the token from path parameters using `userManager.checkToken()`

## Testing

### Test 1: Non-Student Booking
1. **Order Client:**
   - Go to the Order client
   - Fill in personal data with email and password
   - Proceed to book tickets
   - ✅ Should successfully book without 401 error

### Test 2: Non-Student Orders List
1. **Web Client:**
   - Go to `/orders` page
   - Click "Als Nicht-Schüler" button
   - Enter email and password
   - Click login
   - ✅ Should see orders list without 500 error or JWT signing error

### Test 3: Student Auth (Both Flows)
1. **Both Clients:**
   - Log in via Keycloak
   - Book tickets or view orders
   - ✅ Should still work as before

## Setup Instructions

If you're setting up this project on a new machine, you'll need to ensure the RSA keys exist:

### Check if Keys Exist
```bash
ls -la apps/Server/service/src/main/resources/*.pem
```

### Generate Keys (if missing)
```bash
cd apps/Server/service/src/main/resources
openssl genrsa -out rsaPrivateKey.pem 2048
openssl rsa -in rsaPrivateKey.pem -pubout -out publicKey.pem
```

**Important**: Keep `rsaPrivateKey.pem` secure and never commit it to version control in production environments. For development, it's included in the repository.

## Related Files
- `apps/Client/Order/src/app/app.config.ts` - Order client Keycloak configuration
- `apps/Client/Web/src/app/app.config.ts` - Web client Keycloak configuration
- `apps/Client/Order/src/app/book.service.ts` - Book service that sends token
- `apps/Client/Web/src/app/order.service.ts` - Order service for fetching orders
- `apps/Client/Order/src/app/personal-data/personal-data.component.ts` - Login/register flow
- `apps/Client/Web/src/app/orders-list/orders-list.component.ts` - Orders list with login
- `apps/Server/service/src/main/java/at/htlleonding/api/BookingResource.java` - Backend booking endpoint
- `apps/Server/service/src/main/java/at/htlleonding/api/OrderResource.java` - Backend orders endpoint
- `apps/Server/service/src/main/java/at/htlleonding/api/UserResource.java` - Backend user login endpoint
- `apps/Server/logic/src/main/java/at/htlleonding/UserManager.java` - Token validation
- `apps/Server/service/src/main/resources/application.properties` - JWT configuration
- `apps/Server/service/src/main/resources/rsaPrivateKey.pem` - RSA private key for signing
- `apps/Server/service/src/main/resources/publicKey.pem` - RSA public key for verification



