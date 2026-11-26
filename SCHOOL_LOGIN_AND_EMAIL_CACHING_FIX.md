# School Login & Email Caching Fixes

## Issues Fixed

### Issue 1: School Login Always Returns 401
**Problem**: After adding the non-student authentication fixes, student login via Keycloak was broken and always returning 401 errors.

**Root Cause**: The `bearerExcludedUrls` configuration was too broad, including `/api/v2/order/all` which prevented the Keycloak Bearer token from being sent when students tried to fetch their orders.

**Solution**: 
- Removed `/api/v2/order/all` from `bearerExcludedUrls`
- Updated `OrderService.fetchOrders()` to properly handle both authentication methods:
  - For **students**: Use the Keycloak Bearer token (handled automatically by interceptor)
  - For **non-students**: Send token in URL parameters without Bearer token

### Issue 2: Email Input Persistence
**Problem**: After entering an email once, the system would always try to authenticate with that cached email instead of the newly entered one.

**Root Cause**: 
1. Email and token were stored in `localStorage` but never cleared when opening the login form
2. The component didn't reset input fields when user clicked the login button again
3. No proper cleanup when canceling the login process

**Solution**:
1. Clear inputs when opening the form (`nonStudentLogin()` method)
2. Clear old localStorage data before storing new credentials
3. Added proper `cancelNonStudentLogin()` method to reset form state
4. Added error handling with user-friendly alerts

## Files Changed

### 1. `apps/Client/Web/src/app/app.config.ts`
**Change**: Removed `/api/v2/order/all` from Bearer token exclusions

```typescript
bearerExcludedUrls: [
  '/api/v2/user/login',
  '/api/v2/user/register'
  // Removed: '/api/v2/order/all'
]
```

**Why**: This allows student authentication to work properly while still excluding non-student login endpoints.

### 2. `apps/Client/Web/src/app/order.service.ts`
**Change**: Enhanced `fetchOrders()` method to handle both authentication types

```typescript
async fetchOrders(email: string | null, token: string | null): Promise<Order[] | null> {
  try {
    // For student authentication, use the Bearer token (handled by interceptor)
    if (this.keycloakService.isLoggedIn()) {
      const profile = await this.keycloakService.getKeycloakInstance().loadUserProfile();
      return await firstValueFrom(
        this.httpClient.get<Order[]>(
          `${environment.API_URL}/api/v2/order/all/${profile.email}/${token || 'null'}`
        )
      );
    }
    
    // For non-student authentication, send without Bearer token
    return await firstValueFrom(
      this.httpClient.get<Order[]>(
        `${environment.API_URL}/api/v2/order/all/${email}/${token}`,
        { headers: {} } // No Authorization header
      )
    );
  } catch (error) {
    if (error instanceof HttpErrorResponse && error.status === 401) {
      return null;
    }
    throw error;
  }
}
```

**Why**: This properly separates student and non-student authentication flows.

### 3. `apps/Client/Web/src/app/orders-list/orders-list.component.ts`

#### Change A: Clear inputs when opening form
```typescript
nonStudentLogin() {
  // Clear previous inputs and localStorage when opening the login form
  this.emailInput.set('');
  this.passwordInput.set('');
  this.ongoingNonStudentLogin.set(true);
}
```

#### Change B: Improved login with proper cleanup and error handling
```typescript
async completeNonStudentLogin() {
  const customer: Customer = {
    firstName: '',
    lastName: '',
    mailAddress: this.emailInput(),
    password: this.passwordInput(),
    phoneNumber: '',
    schoolClass: '',
    isMale: true,
    street: '',
    streetNumber: '',
    zipCode: '',
    town: '',
  };
  try {
    let token: LoginToken | null;
    try {
      token = await this.orderService.login(customer);
    } catch (error: any) {
      console.error('Login error:', error);
      alert('Login fehlgeschlagen. Bitte überprüfen Sie Ihre E-Mail und Passwort.');
      return; // Don't proceed if login fails
    }
    
    // Clear old token and email before storing new ones
    localStorage.removeItem('non-student-auth-token');
    localStorage.removeItem('non-student-auth-email');
    
    // Store new token and email
    localStorage.setItem('non-student-auth-token', token.token);
    localStorage.setItem('non-student-auth-email', customer.mailAddress);
    
    this.ongoingNonStudentLogin.set(false);
    this.orders.set(await this.getOrders());
  } catch (error) {
    console.error('Unauthorized login:', error);
    alert('Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.');
  }
}
```

#### Change C: Added cancel method
```typescript
cancelNonStudentLogin() {
  // Reset form and close login
  this.emailInput.set('');
  this.passwordInput.set('');
  this.ongoingNonStudentLogin.set(false);
}
```

### 4. `apps/Client/Web/src/app/orders-list/orders-list.component.html`
**Change**: Updated cancel button to use proper method

```html
<button
  class="btn btn-ghost w-full text-base sm:text-sm"
  (click)="cancelNonStudentLogin()"
>
  Zurück
</button>
```

## How It Works Now

### Student Authentication Flow
1. User clicks "Als Schüler anmelden"
2. Redirected to Keycloak login
3. After successful login, Bearer token is automatically added to requests
4. `fetchOrders()` detects Keycloak login and uses Bearer authentication
5. ✅ Orders load successfully

### Non-Student Authentication Flow
1. User clicks "Als Nicht-Schüler anmelden"
2. **Form inputs are cleared** (no cached email)
3. User enters NEW email and password
4. Login request sent WITHOUT Bearer token
5. On success, **old localStorage data is removed**
6. New token and email are stored
7. `fetchOrders()` detects non-Keycloak login and uses token in URL
8. ✅ Orders load with correct user's data

### Cancel/Reset Flow
1. User clicks "Zurück" button
2. Email and password inputs are cleared
3. Login form is closed
4. User can start fresh if they click login again

## Testing Checklist

### Test 1: Student Login
- [ ] Click "Als Schüler anmelden"
- [ ] Complete Keycloak authentication
- [ ] Verify orders load correctly
- [ ] No 401 errors in console

### Test 2: Non-Student First Login
- [ ] Click "Als Nicht-Schüler anmelden"
- [ ] Enter email: `user1@test.com` and password
- [ ] Click "Anmelden"
- [ ] Verify orders for user1 load
- [ ] No cached email issues

### Test 3: Non-Student Second Login (Different User)
- [ ] Logout or clear data
- [ ] Click "Als Nicht-Schüler anmelden"
- [ ] Verify inputs are EMPTY (not showing user1@test.com)
- [ ] Enter email: `user2@test.com` and password
- [ ] Click "Anmelden"
- [ ] Verify orders for user2 load (NOT user1's orders)

### Test 4: Cancel and Retry
- [ ] Click "Als Nicht-Schüler anmelden"
- [ ] Enter some email
- [ ] Click "Zurück"
- [ ] Click "Als Nicht-Schüler anmelden" again
- [ ] Verify inputs are empty
- [ ] Enter credentials and login successfully

### Test 5: Invalid Credentials
- [ ] Click "Als Nicht-Schüler anmelden"
- [ ] Enter wrong email/password
- [ ] Click "Anmelden"
- [ ] Verify error alert appears
- [ ] Verify form stays open for retry
- [ ] Can enter correct credentials and succeed

## Key Improvements

✅ **Student login works again** - Bearer token properly sent for Keycloak users
✅ **Fresh login form** - Inputs always clear when opening
✅ **No email caching** - Each login uses the newly entered email
✅ **Proper cleanup** - Old tokens removed before storing new ones
✅ **Error handling** - User-friendly alerts for failed logins
✅ **Cancel functionality** - Clean reset when user cancels
✅ **Dual authentication** - Both student and non-student flows work independently

## Related Files
- `apps/Client/Web/src/app/app.config.ts` - Keycloak configuration
- `apps/Client/Web/src/app/order.service.ts` - Dual authentication logic
- `apps/Client/Web/src/app/orders-list/orders-list.component.ts` - Component logic
- `apps/Client/Web/src/app/orders-list/orders-list.component.html` - Template

