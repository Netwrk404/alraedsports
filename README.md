This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Badminton catalog

Run `npm run seed:badminton-products` to add the shared list of 20 shoes and 10 accessories to the Badminton category. The script uploads their images to Supabase Storage, saves descriptions, uses listed prices or range midpoints, and starts products with zero stock. Prices are mostly indicative, and suggested models should be verified before sale.

## Stripe card and Apple Pay checkout

Checkout uses Stripe-hosted Checkout in AED. Customers sign in, save a phone number and delivery address under `/account`, then use the cart's **Proceed to payment** button. The server reloads product names, prices, and available stock from Supabase; browser prices are never used to charge a customer. Apple Pay can be offered by Stripe Checkout on supported devices when enabled for the Stripe account.

### Database setup

In the Supabase SQL Editor, run `SUPABASE_STRIPE_CHECKOUT_MIGRATION.sql` after the existing account and order-safety migrations (and after `SUPABASE_ZOHO_STOCK_MIGRATION.sql` if Zoho stock sync is enabled). It adds Stripe payment fields and service-only RPCs. Items are reserved while Checkout is open so two customers cannot buy the same remaining stock. The `products.stock` value is reduced only after a signed Stripe payment webhook confirms the exact order amount; cancelled or expired unpaid sessions release their reservations. The Zoho sync RPC also accounts for confirmed Stripe sales since its previous successful sync so a stale Zoho quantity does not immediately restore stock deducted by this site.

### Local test setup

1. In Stripe Dashboard, switch to **Test mode** and copy the test secret key (`sk_test_...`). Never put secret keys in browser code, Git, or chat.
2. Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `NEXT_PUBLIC_SITE_URL=http://localhost:3000` to `.env.local`. Use the Stripe CLI signing secret for local webhook testing; do not use a dashboard webhook secret for local forwarding.
3. Install and authenticate the Stripe CLI, then run `stripe listen --forward-to localhost:3000/api/checkout/webhook`. Copy the printed `whsec_...` value into `STRIPE_WEBHOOK_SECRET` and restart the Next.js dev server.
4. Start the site with `npm run dev`, sign in with Google, and complete a phone number and delivery address in `/account`.
5. Add an in-stock product to the bag and proceed to payment. In Stripe Checkout, use test card `4242 4242 4242 4242`, a future expiry date, any CVC, and any postal code. Test cancellation and session expiry too.
6. Confirm the order is paid at `/account/orders` and in the admin dashboard. Verify that the exact item quantities were deducted once from Supabase; replayed webhook events must not deduct them again.

### Vercel and live setup

1. Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `NEXT_PUBLIC_SITE_URL` in Vercel Project Settings → Environment Variables. Initially use test-mode values and the production site URL, for example `https://your-domain.example`.
2. In Stripe Dashboard, create a webhook endpoint for `https://your-domain.example/api/checkout/webhook`, select `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded`, and `checkout.session.async_payment_failed`, then copy its signing secret into Vercel as `STRIPE_WEBHOOK_SECRET`.
3. Deploy/redeploy after adding the variables. Run a full test-mode order against the deployed site and verify both the customer order history and admin order details.
4. Before accepting live payments, complete Stripe account verification, confirm with Stripe and ADCB that the intended payout account is acceptable, switch to live Stripe keys, and create a separate live-mode webhook endpoint and signing secret. Keep test and live credentials separate.

The admin dashboard displays the confirmed payment method, paid time, and Stripe PaymentIntent reference. The application does not store card numbers or CVCs. This setup does not send a separate payment email; Stripe's receipt settings can be configured in Stripe Dashboard if email receipts are desired.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
