const { test, expect } = require('@playwright/test')

// Critical user flows for SikaRemit application
test.describe('Critical User Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Set up viewport and test environment
    await page.setViewportSize({ width: 1280, height: 720 })
    
    // Mock API responses for consistent testing
    await page.route('**/api/v1/accounts/login/', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access: 'mock-access-token',
          refresh: 'mock-refresh-token',
          user: {
            id: 1,
            email: 'test@example.com',
            name: 'Test User',
            role: 'customer'
          }
        })
      })
    })

    await page.route('**/api/v1/accounts/customers/balance/', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          available: 1000,
          pending: 100,
          currency: 'GHS',
          last_updated: '2024-01-01T00:00:00Z'
        })
      })
    })

    await page.route('**/api/v1/accounts/customers/payments/', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '1',
            amount: 100,
            currency: 'GHS',
            status: 'completed',
            merchant: 'Test Merchant',
            description: 'Test payment',
            created_at: '2024-01-01T00:00:00Z',
            payment_method: 'mobile_money'
          }
        ])
      })
    })
  })

  test.describe('Authentication Flow', () => {
    test('should allow customer to login successfully', async ({ page }) => {
      await page.goto('/auth/login')
      
      // Fill login form
      await page.fill('input[name="email"]', 'test@example.com')
      await page.fill('input[name="password"]', 'password123')
      
      // Click login button
      await page.click('button[type="submit"]')
      
      // Should redirect to customer dashboard
      await expect(page).toHaveURL('/customer/dashboard')
      
      // Should show user name
      await expect(page.locator('text=Test User')).toBeVisible()
      
      // Should show balance
      await expect(page.locator('text=GHS 1,000')).toBeVisible()
    })

    test('should show error for invalid credentials', async ({ page }) => {
      // Mock failed login
      await page.route('**/api/v1/accounts/login/', async route => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Invalid credentials'
          })
        })
      })

      await page.goto('/auth/login')
      
      await page.fill('input[name="email"]', 'invalid@example.com')
      await page.fill('input[name="password"]', 'wrongpassword')
      await page.click('button[type="submit"]')
      
      // Should show error message
      await expect(page.locator('text=Invalid credentials')).toBeVisible()
      
      // Should stay on login page
      await expect(page).toHaveURL('/auth/login')
    })

    test('should allow user to logout', async ({ page }) => {
      // First login
      await page.goto('/auth/login')
      await page.fill('input[name="email"]', 'test@example.com')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')
      
      // Wait for dashboard to load
      await expect(page).toHaveURL('/customer/dashboard')
      
      // Click user menu
      await page.click('[aria-label="User menu"]')
      
      // Click logout
      await page.click('text=Sign out')
      
      // Should redirect to home/login
      await expect(page).toHaveURL('/')
    })
  })

  test.describe('Customer Dashboard Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Auto-login for dashboard tests
      await page.goto('/auth/login')
      await page.fill('input[name="email"]', 'test@example.com')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')
      await expect(page).toHaveURL('/customer/dashboard')
    })

    test('should display dashboard with correct data', async ({ page }) => {
      // Check balance display
      await expect(page.locator('text=Available Balance')).toBeVisible()
      await expect(page.locator('text=GHS 1,000')).toBeVisible()
      
      // Check recent transactions
      await expect(page.locator('text=Recent Transactions')).toBeVisible()
      await expect(page.locator('text=Test Merchant')).toBeVisible()
      
      // Check quick actions
      await expect(page.locator('text=Quick Actions')).toBeVisible()
      await expect(page.locator('text=Deposit')).toBeVisible()
      await expect(page.locator('text=Withdraw')).toBeVisible()
      await expect(page.locator('text=Transfer')).toBeVisible()
    })

    test('should navigate to payment pages', async ({ page }) => {
      // Click on Deposit
      await page.click('text=Deposit')
      await expect(page).toHaveURL('/customer/payments/top-up')
      
      // Go back to dashboard
      await page.click('[aria-label="Back to dashboard"]')
      await expect(page).toHaveURL('/customer/dashboard')
      
      // Click on Withdraw
      await page.click('text=Withdraw')
      await expect(page).toHaveURL('/customer/payments/withdraw')
    })

    test('should display transaction history', async ({ page }) => {
      // Click on transactions link
      await page.click('a[href="/customer/transactions"]')
      await expect(page).toHaveURL('/customer/transactions')
      
      // Should show transaction list
      await expect(page.locator('text=Test Merchant')).toBeVisible()
      await expect(page.locator('text=GHS 100')).toBeVisible()
      await expect(page.locator('text=completed')).toBeVisible()
    })
  })

  test.describe('Payment Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Login and navigate to payment
      await page.goto('/auth/login')
      await page.fill('input[name="email"]', 'test@example.com')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')
      await expect(page).toHaveURL('/customer/dashboard')
    })

    test('should initiate top-up payment', async ({ page }) => {
      // Mock payment API
      await page.route('**/api/v1/payments/top-up/', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'payment-123',
            status: 'pending',
            amount: 100,
            currency: 'GHS'
          })
        })
      })

      // Navigate to top-up
      await page.click('text=Deposit')
      await expect(page).toHaveURL('/customer/payments/top-up')
      
      // Fill payment form
      await page.fill('input[name="amount"]', '100')
      await page.selectOption('select[name="payment_method"]', 'mobile_money')
      await page.fill('input[name="phone_number"]', '+233123456789')
      
      // Submit payment
      await page.click('button[type="submit"]')
      
      // Should show success message
      await expect(page.locator('text=Payment initiated successfully')).toBeVisible()
    })

    test('should validate payment form', async ({ page }) => {
      // Navigate to top-up
      await page.click('text=Deposit')
      
      // Try to submit empty form
      await page.click('button[type="submit"]')
      
      // Should show validation errors
      await expect(page.locator('text=Amount is required')).toBeVisible()
      await expect(page.locator('text=Payment method is required')).toBeVisible()
    })
  })

  test.describe('Responsive Design', () => {
    test('should work on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Login
      await page.goto('/auth/login')
      await page.fill('input[name="email"]', 'test@example.com')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')
      await expect(page).toHaveURL('/customer/dashboard')
      
      // Check mobile navigation
      await expect(page.locator('[aria-label="Mobile menu"]')).toBeVisible()
      
      // Open mobile menu
      await page.click('[aria-label="Mobile menu"]')
      await expect(page.locator('text=Dashboard')).toBeVisible()
      await expect(page.locator('text=Payments')).toBeVisible()
    })

    test('should work on tablet devices', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 })
      
      // Login
      await page.goto('/auth/login')
      await page.fill('input[name="email"]', 'test@example.com')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')
      await expect(page).toHaveURL('/customer/dashboard')
      
      // Check tablet layout
      await expect(page.locator('text=Quick Actions')).toBeVisible()
      await expect(page.locator('text=Recent Transactions')).toBeVisible()
    })
  })

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      // Login
      await page.goto('/auth/login')
      await page.fill('input[name="email"]', 'test@example.com')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')
      await expect(page).toHaveURL('/customer/dashboard')
      
      // Test keyboard navigation
      await page.keyboard.press('Tab')
      await expect(page.locator(':focus')).toBeVisible()
      
      // Navigate through quick actions using keyboard
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab')
        const focused = page.locator(':focus')
        await expect(focused).toBeVisible()
      }
    })

    test('should have proper ARIA labels', async ({ page }) => {
      // Login
      await page.goto('/auth/login')
      await page.fill('input[name="email"]', 'test@example.com')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')
      await expect(page).toHaveURL('/customer/dashboard')
      
      // Check for ARIA labels
      await expect(page.locator('[aria-label="User menu"]')).toBeVisible()
      await expect(page.locator('[role="navigation"]')).toBeVisible()
      await expect(page.locator('[aria-label="Quick Actions"]')).toBeVisible()
    })
  })

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Mock network error
      await page.route('**/api/v1/accounts/customers/balance/', route => {
        route.abort('failed')
      })

      // Login
      await page.goto('/auth/login')
      await page.fill('input[name="email"]', 'test@example.com')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')
      await expect(page).toHaveURL('/customer/dashboard')
      
      // Should show error message
      await expect(page.locator('text=You appear to be offline')).toBeVisible()
    })

    test('should handle server errors gracefully', async ({ page }) => {
      // Mock server error
      await page.route('**/api/v1/accounts/customers/payments/', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' })
        })
      })

      // Login
      await page.goto('/auth/login')
      await page.fill('input[name="email"]', 'test@example.com')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')
      await expect(page).toHaveURL('/customer/dashboard')
      
      // Navigate to transactions
      await page.click('a[href="/customer/transactions"]')
      
      // Should show error message
      await expect(page.locator('text=Server error occurred')).toBeVisible()
    })
  })
})
