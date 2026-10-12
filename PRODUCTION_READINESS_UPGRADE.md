# Durgas E-Commerce Website — Production Readiness Upgrade

Act as a senior full-stack developer, Supabase/PostgreSQL database architect, application security engineer, payment integration specialist, and DevOps engineer.

Your task is to inspect, upgrade, test, and prepare my existing **Durgas e-commerce website** for production deployment.

## 1. Inspect the Existing Project

- Analyze the entire project structure before making changes.
- Identify the frontend framework, backend framework, database, authentication system, payment integration, admin panel, APIs, and deployment configuration.
- Inspect all existing source files, dependencies, environment variables, database schemas, and configuration files.
- Identify incomplete features, security vulnerabilities, dependency conflicts, broken routes, and runtime errors.
- Preserve the existing Durgas branding, UI design, product pages, and working functionality.
- Do not delete or rebuild working features unnecessarily.
- Create a prioritized implementation plan and then execute it.

## 2. Complete Supabase Database Migration

- Migrate all existing database functionality to Supabase PostgreSQL where appropriate.
- Convert existing database schemas, queries, relationships, and data types correctly.
- Create tables for users, profiles, products, categories, product variants, inventory, carts, orders, order items, payments, addresses, coupons, and returns as required by the existing application.
- Add primary keys, foreign keys, constraints, indexes, timestamps, and appropriate transaction handling.
- Create version-controlled database migrations.
- Configure Row Level Security (RLS) policies for every exposed table.
- Enforce customer-specific access and restrict administrative operations to authorized administrators.
- Use secure environment variables for Supabase configuration.
- Never expose the Supabase service-role key or other privileged credentials in frontend code.
- Migrate existing data safely, verify record counts and relationships, and document the rollback procedure.
- Configure database backups and verify restoration procedures.

## 3. Implement Secure Authentication and Authorization

- Implement secure customer registration, login, logout, password reset, and session management.
- Integrate Supabase Auth if appropriate for the existing architecture.
- Implement server-side authorization for customer and admin operations.
- Protect admin dashboards, inventory management, order management, and product management.
- Prevent customers from accessing other users' profiles, addresses, orders, and payment information.
- Validate authorization on the server for every sensitive operation.
- Apply secure cookie settings and appropriate session-expiration policies.
- Never rely solely on frontend route protection.

## 4. Integrate Razorpay Payments Securely

- Integrate Razorpay using server-side payment-order creation.
- Verify payment signatures on the backend.
- Verify webhook signatures using the raw request body and webhook secret.
- Store payment IDs, order IDs, amounts, currency, and payment statuses securely.
- Make checkout and order creation idempotent to prevent duplicate orders or payments.
- Verify the expected amount, currency, order reference, and payment status before confirming an order.
- Handle successful payments, failed payments, pending payments, timeouts, cancellations, refunds, and webhook retries.
- Update inventory consistently and prevent overselling during concurrent purchases.
- Never trust payment success messages received only from the frontend.
- Use Razorpay test mode and test credentials during development.
- Keep live payment credentials in server-side environment variables.
- Do not enable production payments until payment verification and checkout tests pass.

## 5. Harden Application Security

- Enforce HTTPS in production.
- Validate and sanitize all user inputs on the server.
- Use parameterized database queries and safe ORM practices.
- Protect against SQL injection, XSS, CSRF where applicable, broken access control, mass assignment, and insecure direct object references.
- Add rate limiting for login, registration, password reset, checkout, and other sensitive APIs.
- Configure security headers, a suitable Content Security Policy, request-size limits, and restrictive CORS rules.
- Restrict file uploads by file type, size, and content; use safe storage policies.
- Prevent unauthorized access to environment files, logs, and internal APIs.
- Remove exposed secrets, debug endpoints, and sensitive production error messages.
- Add appropriate logging without recording passwords, tokens, payment secrets, or unnecessary personal data.
- Review dependencies for known vulnerabilities and incompatible versions.

## 6. Complete E-Commerce Functionality
Ensure the following features work correctly:

- Product browsing, search, filtering, sorting, and product details.
- Product images, categories, sizes, colours, variants, and pricing.
- Cart management and persistent cart functionality where appropriate.
- Shipping address management and delivery information.
- Coupon and discount validation.
- Accurate subtotal, shipping, discount, tax, and final-total calculations.
- Secure checkout and payment processing.
- Order confirmation and order history.
- Order cancellation, returns, and refunds.
- Inventory tracking and stock reservation or adjustment.
- Order statuses, shipping updates, and customer notifications.
- Admin product, category, inventory, order, customer, and discount management.
- Appropriate empty states, loading indicators, validation messages, and error handling.
Calculate prices and totals on the server using trusted database values. Never trust client-submitted prices or discounts.

## 7. Configure Email and Notifications

- Configure a reliable transactional email provider.
- Send order confirmations, payment updates, shipping notifications, password-reset emails, and cancellation or refund notifications as appropriate.
- Store provider credentials securely.
- Add retry handling and logging for failed email delivery.
- Configure sender identity and domain authentication where supported.
- Add valid customer support contact information.

## 8. Production Deployment and DevOps

- Prepare separate development, staging, and production environments.
- Configure frontend and backend hosting based on the existing architecture.
- Set up the production domain and HTTPS.
- Configure environment variables through the hosting provider.
- Never commit secrets, API keys, database passwords, or production credentials to Git.
- Add health-check endpoints and graceful error handling.
- Configure structured application logs, error monitoring, and uptime monitoring.
- Add CI/CD checks for linting, type checking, automated tests, build validation, and database migration review.
- Add deployment documentation, rollback instructions, and database recovery procedures.
- Use Docker only where appropriate for the existing application and hosting requirements.
- Verify the production build and deployment configuration.

## 9. Testing and Quality Assurance
Create and execute automated tests for:

- Registration, login, logout, and password reset.
- Customer and administrator permissions.
- Product listing, product variants, pricing, and stock.
- Cart calculations, discounts, taxes, and shipping charges.
- Order creation and duplicate request prevention.
- Razorpay signature and webhook verification.
- Payment success, failure, timeout, cancellation, and refunds.
- Database constraints and RLS policies.
- Inventory consistency and concurrent checkout.
- Customer order history and admin operations.
- Email delivery failure handling.
- Mobile responsiveness, accessibility, and important user journeys.
Run dependency checks, linting, type checking, tests, and the production build. Fix failures introduced by the upgrade and report any unresolved pre-existing issues.

## 10. Performance, SEO, and Accessibility

- Optimize images and use responsive image formats.
- Add lazy loading where appropriate.
- Configure caching and a CDN where beneficial.
- Improve page loading performance and reduce unnecessary API requests.
- Add meaningful page titles, meta descriptions, canonical URLs, sitemap.xml, and robots.txt.
- Add valid structured product data where applicable.
- Ensure mobile responsiveness, keyboard navigation, readable contrast, accessible forms, and descriptive image alt text.
- Test important pages on mobile and desktop.

## 11. Legal and Customer Information
Prepare appropriate pages for:

- Privacy policy.
- Terms and conditions.
- Shipping and delivery policy.
- Return and refund policy.
- Contact and customer support.
Ensure policies reflect the actual business practices and applicable legal requirements. Do not invent business addresses, registrations, guarantees, or certifications.

## 12. Final Production Readiness Audit
After implementation:

1. Summarize the original project architecture and identified issues.
2. List all files created, modified, or removed.
3. Explain all database schema changes and migrations.
4. Provide a complete list of required environment variable names with safe example placeholders, never real secrets.
5. Provide exact installation, local development, testing, and deployment commands.
6. Report the actual results of automated tests, security checks, and production builds.
7. Identify external services that require account setup or manual configuration.
8. Provide a deployment checklist and rollback instructions.
9. Clearly identify any feature that remains incomplete or unverified.
10. Do not claim a feature is secure, tested, migrated, or production-ready unless you have verified it.

## Critical Rules

- Work directly within the existing Durgas project directory.
- Inspect the actual folder structure before running commands or assuming that a backend folder exists.
- Detect the package manager and follow the existing project conventions.
- Avoid unnecessary framework changes or destructive database operations.
- Back up important data before migrations.
- Do not use mock payment success responses in production.
- Do not expose secrets or weaken security policies to make the application work.
- Do not silently ignore errors or replace real functionality with placeholder implementations.
- Ask for clarification before any destructive action that could cause data loss.
- Prioritize security, payment correctness, database integrity, and reliable checkout over cosmetic changes.

## Final Goal
Deliver a fully tested, secure, maintainable, and deployment-ready Durgas e-commerce website integrated with Supabase PostgreSQL and Razorpay, while preserving the existing design and functionality.

Begin by inspecting the existing project, then implement the improvements systematically. Continue until the verifiable work is complete, and clearly report any remaining blockers before production launch.

---

# Durgas Jewellery E-Commerce — Complete Product Catalog & Supabase Integration

Act as a Senior Full-Stack Developer, Supabase Database Architect, E-Commerce Engineer, Security Engineer, and QA Engineer.

Upgrade my existing **Durgas jewellery e-commerce website** to support complete, secure, and production-ready product catalog management using Supabase PostgreSQL.

## 1. Inspect the Existing Project First

Before making changes, inspect the complete project structure, including:

- Frontend and UI components
- Backend and API routes
- Admin dashboard
- Existing product and category management
- Database schema and existing data
- Authentication and authorization
- Supabase configuration
- Product images and storage
- Cart, checkout, and pricing logic
- Existing tests and dependencies

Identify the current technology stack and how the frontend, backend, and database communicate.

Create a report of the existing architecture, errors, missing functionality, and implementation plan.

**Important:** Do not assume file paths, database tables, frameworks, or environment variables. Inspect the actual project before editing anything.

## 2. Supabase PostgreSQL Integration

Connect the existing application to my Supabase project.

Implement or improve the database schema for:

- Products
- Product images
- Categories
- Brands
- Product variants
- Inventory
- Product reviews
- Ratings
- Customers and user relationships, where required

Use appropriate:

- Primary keys
- Foreign keys
- Unique constraints
- Data validation constraints
- Database indexes
- Created and updated timestamps
- Relationships between tables
- Database migrations

Use the existing database structure where appropriate instead of creating duplicate tables.

Create version-controlled SQL migration files for every schema change.

Never overwrite, delete, or migrate live production data without my explicit approval.

## 3. Complete Product Management

Each product should support the following fields where appropriate:

- Product ID
- Product name
- SKU
- Barcode
- Description
- Short description
- Category
- Brand
- Multiple product images
- Product price
- Sale price
- Discount information
- Product weight and dimensions, if applicable
- Material and jewellery specifications
- Sizes
- Colours
- Variants
- Available stock
- Product status
- Featured product status
- SEO title and description
- Created date
- Updated date

Use database constraints and backend validation to ensure data integrity.

Do not invent real products, prices, brands, stock quantities, or jewellery specifications. Ask me for missing business information.

## 4. Product Variants

Implement a flexible product variant system.

Support relevant attributes such as:

- Size
- Colour
- Material
- Weight
- Design
- Other product-specific attributes

Each variant should be capable of having its own:

- SKU or barcode
- Price, when applicable
- Sale price, when applicable
- Stock quantity
- Availability
- Image, where applicable

Only implement attributes that make sense for the existing Durgas jewellery catalog.

Ensure each variant is linked to the correct product and prevent duplicate variant identifiers where uniqueness is required.

## 5. Secure Admin Product Management

Upgrade the existing admin panel without unnecessarily changing its branding or layout.

Authorized administrators should be able to:

- Create products
- Edit product details
- Archive or deactivate products
- Manage categories and brands
- Upload, replace, reorder, and remove product images
- Create and edit variants
- Update prices and sale prices
- Update stock quantities
- Manage SKUs and barcodes
- View product availability
- Manage reviews and ratings
- Search, filter, sort, and paginate products
- View validation errors and operation status

Add confirmation dialogs for destructive operations.

Restrict all administrative operations to authorized users on the server or through correctly enforced Supabase policies.

Never rely on frontend-only role checks.

## 6. Product Images and Supabase Storage

Use Supabase Storage if appropriate for the existing architecture.

Implement:

- Secure image uploads
- Multiple images per product
- Image preview
- Image ordering
- Image replacement
- Image removal
- File size validation
- Image type validation
- Safe file naming
- Appropriate storage permissions
- Image optimization and responsive rendering

Keep storage paths and database image references consistent.

Do not expose private files through public URLs. Use signed URLs where private access is required.

Do not delete existing images or files without verifying their usage.

## 7. Storefront Product Display

Update the customer-facing storefront to display:

- Product images
- Product names
- Product descriptions
- Prices
- Sale prices
- Discounts
- Categories
- Brands
- Available sizes and colours
- Variant selection
- SKU or relevant product specifications
- Stock availability
- Product ratings
- Customer reviews
- Related products, if supported

Add or improve:

- Product detail pages
- Product search
- Category filtering
- Price filtering
- Sorting
- Pagination
- Image gallery
- Image zoom, where appropriate
- Mobile-responsive layouts

Preserve the existing Durgas jewellery branding, logo, colour palette, layout, and working features unless a change is necessary and approved.

## 8. Pricing, Discounts, and Inventory Security

Implement secure pricing and inventory logic.

Requirements:

- Validate prices and discounts on the backend.
- Retrieve authoritative product prices from trusted database records.
- Never trust prices submitted by the browser.
- Validate product and variant availability during cart operations.
- Recalculate cart totals on the server.
- Validate sale prices against the configured pricing rules.
- Prevent negative prices and invalid stock values.
- Prevent overselling through appropriate database transactions or atomic stock updates.
- Ensure concurrent purchases cannot incorrectly allocate the same stock.
- Record inventory changes when appropriate.

Do not invent discount rules, tax rules, or jewellery pricing policies. Ask me if the business rules are unclear.

## 9. Ratings and Customer Reviews

Implement customer reviews securely.

Support:

- Product rating
- Review text
- Review creation
- Review editing and deletion according to defined ownership rules
- Review moderation
- Average product rating
- Review count
- Rating distribution, if appropriate

Enforce ownership on the backend or through Supabase Row Level Security policies.

Customers must not be able to edit or delete another customer's review, impersonate another reviewer, or directly modify protected moderation fields.

If verified-purchase reviews are required, derive purchase eligibility from trusted order records.

Prevent duplicate reviews according to the approved business rules.

Validate rating values and review text.

## 10. Authentication, Authorization, and Supabase RLS

Inspect the existing authentication system before changing it.

Implement appropriate access rules for:

- Public product browsing
- Authorized product administration
- Customer review creation
- Review ownership
- Inventory modification
- Product price modification
- Product image management

Enable and configure Row Level Security (RLS) for tables exposed through Supabase APIs.

Use least-privilege access policies.

Keep service-role and secret keys exclusively on trusted server-side environments. Never expose them through frontend environment variables or browser code.

Do not weaken existing authentication to make the integration work.

## 11. Frontend States and User Experience

Add meaningful:

- Loading states
- Empty catalog states
- Empty category states
- Form validation errors
- Image upload progress
- Success notifications
- Error notifications
- Retry options
- Network failure handling
- Confirmation dialogs

Prevent duplicate form submissions and handle failed database operations gracefully.

Ensure accessibility, keyboard navigation, responsive design, and consistent styling.

## 12. API and Backend Improvements

Inspect existing APIs and reuse them where appropriate.

Implement secure product operations for:

- Listing products
- Retrieving product details
- Creating products
- Updating products
- Archiving products
- Managing categories and brands
- Managing variants
- Managing inventory
- Managing images
- Submitting and moderating reviews

Validate all incoming data.

Apply authorization checks to every protected operation.

Use transactions or database functions where multiple database changes must succeed or fail together.

Return appropriate HTTP status codes and safe error messages.

Do not expose credentials, internal stack traces, or sensitive database information.

## 13. Product Catalog Testing

Add and run relevant automated tests for:

- Product creation
- Product editing
- Product archiving
- Category and brand relationships
- Product variants
- SKU and barcode uniqueness
- Image upload validation
- Pricing validation
- Sale price and discount calculations
- Inventory updates
- Concurrent stock changes
- Product availability
- Review creation
- Review ownership
- Review validation
- Admin authorization
- Supabase RLS policies
- Frontend loading and error states

Use the project's existing test framework where possible.

Use an isolated test database or safe test environment.

Do not run destructive tests against production data.

Report the actual test results. Never claim that a test passed unless it was executed successfully.

## 14. Environment Configuration

Inspect the existing environment configuration.

Provide an appropriate `.env.example` with documented variable names, without real credentials.

Keep development, test, and production environments separate.

If Supabase credentials or other external service configuration are missing, ask me to configure them securely.

Do not request that I paste secret service-role keys or database passwords into chat.

Do not commit `.env` or `.env.local` files containing secrets.

## 15. Product Catalog Documentation

Create or update the following documentation where appropriate:

- `README.md`
- `SUPABASE_SETUP.md`
- `DATABASE.md`
- `PRODUCT_CATALOG.md`
- `SECURITY.md`
- `TESTING.md`

Document:

- Supabase project setup
- Required environment variables
- SQL migrations
- Database relationships
- Storage bucket configuration
- RLS policies
- Product management workflows
- Local development
- Testing commands
- Deployment requirements
- Troubleshooting

Only document features that actually exist.

## 16. Product Catalog Implementation Workflow

Follow this sequence:

1. Inspect the actual project.
2. Document the current architecture.
3. Identify existing tables, APIs, components, and errors.
4. Produce a prioritized implementation plan.
5. Confirm any unclear product or business rules with me.
6. Create and review database migrations.
7. Implement secure Supabase integration.
8. Implement product and variant management.
9. Implement inventory and pricing validation.
10. Implement image storage.
11. Implement customer-facing product pages.
12. Implement secure reviews and ratings.
13. Add tests.
14. Run linting, type checks, tests, and production builds.
15. Fix reproducible errors.
16. Document all changes.

Make incremental, reviewable changes. Do not replace the entire project unnecessarily.

## 17. Product Catalog Final Report

After implementation, provide:

1. Summary of the original project.
2. Existing issues discovered.
3. Architecture changes.
4. Database tables and relationships added or changed.
5. SQL migration files created.
6. Supabase configuration changes.
7. Frontend and backend files modified.
8. New files created.
9. Security and RLS improvements.
10. Tests executed and actual results.
11. Build and validation results.
12. Required manual configuration.
13. Remaining incomplete tasks.
14. Instructions to run the application locally.
15. Instructions for safely deploying the changes.

Classify the result as one of:

- **READY**
- **READY WITH CONFIGURATION REQUIRED**
- **NOT READY**

Explain the evidence supporting the final status.

## Product Catalog Critical Rules

- Work on the existing Durgas project, not a newly created replacement.
- Preserve the existing design and functionality.
- Protect live data and ask before destructive database operations or actions affecting live customers or orders.
- Do not fabricate credentials, product information, prices, stock quantities, business rules, test results, or completed integrations.
- If required credentials or business information are missing, explain exactly what must be configured or ask for clarification.
- Do not claim production readiness until the required checks pass.

## Start Product Catalog Work

Inspect the existing Durgas jewellery e-commerce project first. Provide the actual project structure and audit findings before making major changes. Then implement product catalog and Supabase integration in small, testable steps.

---

# DURGAS JEWELLERY E-COMMERCE

## Razorpay Payment Integration & Order Management — Production Upgrade

### Role

Act as a Senior Full-Stack Developer, Express.js Backend Engineer, Supabase PostgreSQL Database Architect, Razorpay Payment Integration Specialist, Security Engineer, and QA Engineer.

Your task is to inspect and upgrade my existing **Durgas Jewellery E-Commerce Website** to implement a secure, reliable, and production-ready payment and order management system using Razorpay.

### 1. Inspect the Existing Project

First inspect the actual project files and identify:

- Frontend checkout and payment pages
- Express.js backend and API routes
- Existing Razorpay integration
- Supabase PostgreSQL configuration
- Products and product variants
- Cart and pricing logic
- Order and payment tables
- Inventory management
- Customer authentication
- Admin dashboard
- Environment variables
- Existing tests and build configuration

Determine what already works, what is incomplete, and what needs to be fixed. Do not assume that any file, table, API, or payment integration exists without verifying it.

**Preserve the existing Durgas branding, website layout, product catalog, and working functionality. Do not rebuild the project from scratch.**

### 2. Razorpay Payment Integration

Integrate or repair Razorpay Checkout using the existing application architecture.

Support payment methods available and enabled for my Razorpay account, including:

- UPI
- Debit cards
- Credit cards
- Net banking
- Cash on delivery, if supported by the existing business configuration

Do not display payment methods that are unavailable or not configured. Use Razorpay's official integration and supported APIs. Keep test and live environments separate.

### 3. Secure Payment Order Creation

Create Razorpay payment orders exclusively through the trusted Express backend.

Before creating a payment order:

1. Validate the customer's cart.
2. Retrieve product and variant prices from Supabase.
3. Verify that products are active and available.
4. Validate quantities and stock.
5. Apply only valid, configured discounts.
6. Calculate taxes and shipping using approved business rules.
7. Calculate the final payable amount on the server.
8. Create an internal order or pending checkout record.
9. Create the Razorpay order using the verified amount and currency.
10. Store the Razorpay order reference against the correct internal order.

Never trust prices, discounts, totals, or payment amounts submitted by the browser. Use an appropriate transaction and inventory reservation strategy to prevent overselling.

### 4. Environment Variables and Secrets

Configure Razorpay using server-side environment variables. Use placeholders in documentation such as:

```env
RAZORPAY_KEY_ID=your_test_key_id
RAZORPAY_KEY_SECRET=your_test_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
RAZORPAY_MODE=test
```

Use the actual variable naming conventions of the existing project if they differ.

Rules:

- Never hardcode secrets.
- Never expose the Razorpay secret key in frontend JavaScript.
- Never commit credentials to Git.
- Never place service-role keys in public frontend environment variables.
- Provide a safe `.env.example`.
- Ask me to configure credentials privately when required.
- Do not invent credentials.

### 5. Payment Verification

Implement secure server-side payment verification. When the frontend receives a Razorpay Checkout response:

1. Send the required payment references to the Express backend.
2. Identify the correct internal order.
3. Verify the payment signature using the official Razorpay procedure and server-side secret.
4. Verify that the payment belongs to the expected Razorpay order.
5. Confirm the amount and currency using trusted payment and order records.
6. Retrieve authoritative payment information from Razorpay when necessary.
7. Check the current internal order and payment status.
8. Update payment and order state only when the required verification succeeds.

Do not mark an order as paid based only on a frontend success message. Reject invalid signatures, mismatched amounts, incorrect currencies, and payments associated with another order. Never mark a failed, pending, or unverified payment as successful.

### 6. Payment Status Management

Implement a consistent payment lifecycle using statuses appropriate to the existing schema. Support:

- CREATED
- PENDING
- AUTHORIZED
- CAPTURED
- FAILED
- REFUND_PENDING
- PARTIALLY_REFUNDED
- REFUNDED

Map Razorpay payment states to internal states correctly. Do not assume every Razorpay payment method follows the same lifecycle.

Store relevant transaction information, including:

- Internal order ID
- Customer reference, where applicable
- Razorpay order ID
- Razorpay payment ID
- Payment amount
- Currency
- Payment method, where available
- Payment status
- Failure reason, where available
- Transaction timestamps
- Refund references, where applicable

Use unique constraints and safe update rules to prevent duplicate payment records. Never store card numbers, CVV values, or other prohibited sensitive payment data.

### 7. Razorpay Webhooks

Implement secure webhook handling.

Requirements:

- Use a dedicated Express webhook endpoint.
- Preserve the exact raw request body required for signature verification.
- Verify webhook signatures using the configured webhook secret.
- Configure middleware carefully so JSON parsing does not destroy the raw body required for verification.
- Reject invalid webhook signatures.
- Store webhook event IDs or equivalent deduplication identifiers.
- Process events idempotently.
- Handle webhook retries safely.
- Handle duplicate events without duplicating orders or payments.
- Handle events arriving out of order.
- Avoid downgrading a confirmed successful payment because of a delayed failure event.
- Reconcile payment and order states using authoritative information when necessary.
- Return appropriate responses and log processing failures safely.
- Do not expose webhook secrets or sensitive payload information in logs.

### 8. Order and Inventory Management

Connect payments to the correct internal order and inventory records. Implement:

- Pending order creation
- Payment confirmation
- Order confirmation
- Inventory reservation or decrement
- Order history
- Payment history
- Cancellation
- Failed payment handling
- Retry payment where supported
- Refund status updates

Use transactions, conditional updates, and database constraints where appropriate. Prevent:

- Duplicate orders
- Duplicate stock deductions
- Overselling
- Payment/order mismatches
- Unauthorized order access
- Stock deductions for unsuccessful payments when the approved workflow does not require them

Define the inventory reservation and release process according to the existing architecture and confirmed business rules. Do not silently release inventory while a payment may still be processing.

### 9. Cash on Delivery

Implement COD only if I confirm that the business supports it.

If enabled:

- Display COD only for eligible orders.
- Validate configured delivery restrictions.
- Create an order with the correct payment method.
- Mark payment as unpaid or pending until payment is collected.
- Track COD collection separately from online payment confirmation.
- Prevent the order from being incorrectly marked as paid at checkout.

Ask me for missing COD rules, delivery restrictions, and cancellation policies.

### 10. Refund Management

Implement refund support through Razorpay where configured. Refunds must be restricted to authorized administrators and validated on the server.

Requirements:

- Verify that the order and payment are eligible for a refund.
- Prevent unauthorized refund requests.
- Validate refund amounts.
- Prevent duplicate refunds.
- Support full or partial refunds where permitted.
- Store the Razorpay refund ID and relevant transaction references.
- Track pending, successful, and failed refund states.
- Update internal order and payment records correctly.
- Reconcile refund status with Razorpay.
- Record administrator actions in an audit log.

Never claim that a refund succeeded until the provider confirms the successful refund status. Do not invent refund eligibility rules or cancellation policies; ask me when they are not present in the project.

### 11. Supabase Database Changes

Inspect the existing Supabase schema before changing anything. Reuse current tables where appropriate. Add or modify payment-related tables and columns only when necessary.

Use appropriate:

- Primary keys
- Foreign keys
- Unique constraints
- Indexes
- Status constraints
- Timestamps
- Transaction handling
- Idempotency records

Create version-controlled SQL migrations for approved changes. Test migrations against a development or isolated test database first.

**Do not run migrations against production, modify live customer/order data, or reset the database without my explicit approval and a verified backup.**

### 12. Frontend Checkout and Order Confirmation

Preserve the existing Durgas design. Improve the checkout interface to provide:

- Clear order summary
- Correct final amount
- Selected payment method
- Payment processing indicator
- Success confirmation
- Failed payment message
- Pending payment message
- Retry option where appropriate
- Order reference
- Order history and payment status
- Mobile-responsive layout

Prevent duplicate checkout submissions. Do not display a success page that implies payment is complete before trusted verification. If payment verification is delayed, display an appropriate pending state and allow the application to reconcile the final status.

### 13. API Security

Inspect and secure the relevant Express endpoints. Implement appropriate:

- Authentication
- Authorization
- Input validation
- Rate limiting
- Error handling
- Request logging
- Secure response formats

Ensure customers can access only their own orders and payments. Verify administrator permissions for refunds and sensitive order operations. Never trust an order ID, customer ID, payment amount, or status submitted by the browser without server-side validation. Keep privileged Supabase operations on the server.

### 14. Automated Testing

Create and run tests using the existing testing framework.

**Successful payments**

- Valid payment signature
- Correct order association
- Correct amount and currency
- Successful payment reconciliation

**Failed and pending payments**

- Failed payment
- Pending payment
- Invalid signature
- Amount mismatch
- Currency mismatch
- Unknown payment reference

**Webhook security**

- Valid webhook
- Invalid webhook signature
- Duplicate event
- Retried event
- Out-of-order events
- Webhook processing failure

**Order and inventory**

- Duplicate checkout submission
- Duplicate payment verification
- Duplicate stock deduction prevention
- Out-of-stock product
- Concurrent purchase
- Database transaction failure

**Refunds and COD**

- Unauthorized refund
- Valid refund request
- Duplicate refund request
- Partial refund, if supported
- Failed refund
- Pending refund
- COD order remains unpaid until collection

Use Razorpay test mode and mocked provider responses where appropriate. Never make live charges or initiate real refunds during automated tests. Report actual test results. Never fabricate successful test runs.

### 15. Payment Documentation

Create or update the appropriate documentation files:

- `README.md`
- `RAZORPAY_SETUP.md`
- `PAYMENT_FLOW.md`
- `DATABASE.md`
- `SECURITY.md`
- `DEPLOYMENT.md`

Document:

- Required environment variables
- Razorpay test-mode configuration
- Webhook setup
- Local development
- Database migrations
- Payment verification
- Refund procedures
- Test commands
- Production deployment requirements

Use placeholders for secrets.

### 16. Payment Implementation Workflow

Follow this sequence:

1. Inspect the complete existing project.
2. Audit the checkout, backend, database, and Razorpay integration.
3. Report existing errors and missing functionality.
4. Create a prioritized implementation plan.
5. Ask for missing business rules or credentials when necessary.
6. Implement payment order creation and verification.
7. Implement webhook verification and idempotency.
8. Implement order and inventory synchronization.
9. Implement approved COD and refund functionality.
10. Improve frontend payment states.
11. Add and run automated tests.
12. Run available lint, type-check, and production-build commands.
13. Document the changes and remaining setup.
14. Obtain approval before production migrations or live-payment activation.

### 17. Payment Final Report

Provide:

1. Existing project architecture and audit findings.
2. Razorpay functionality already present.
3. Bugs and security issues discovered.
4. Every modified file and why it changed.
5. Every new file and its purpose.
6. Database changes and migration files.
7. API endpoints created or modified.
8. Payment verification and webhook security improvements.
9. Order, inventory, COD, and refund behavior.
10. Tests executed and actual results.
11. Build status.
12. Required environment variables using placeholders.
13. Manual Razorpay dashboard configuration required.
14. Remaining issues and launch blockers.
15. Exact commands to run the application locally.
16. Steps required to enable live payments safely.

Classify the final result as:

- **READY**
- **READY WITH CONFIGURATION REQUIRED**
- **NOT READY**

Explain the evidence supporting that status.

### Payment Critical Rules

- Inspect before modifying.
- Preserve the existing Durgas website and working features.
- Do not rebuild the application unnecessarily.
- Do not invent credentials or business rules.
- Never expose payment secrets.
- Never trust frontend payment confirmation.
- Never fabricate test results.
- Never use live payment transactions for testing.
- Never modify production data without explicit approval.
- Never claim payment or refund success without authoritative verification.

### Start Payment Upgrade

Inspect my existing Durgas project files first. Identify the actual Express backend, frontend checkout, Supabase schema, and Razorpay implementation. Provide the audit report and implementation plan before major changes. Then upgrade the existing system incrementally, test it thoroughly, and report exactly what is complete and what still requires configuration or approval.
