# Phase 10 Delivery — Payments and Receipts

## Fee obligations

- Tenant-defined fee categories
- Academic period and description
- Gross amount, discount and net amount in integer centimes
- Due date and reference
- Installment number/count metadata
- Parent-child relationship verification
- Pending, Partial, Paid, Overdue and Cancelled states
- Paid obligations cannot be cancelled

## Manual transactions

- Partial or full payments
- Cash, bank transfer, cheque, manually recorded card or other
- External reference and notes
- Outstanding-balance validation
- Browser cannot set payment status directly
- Status derived server-side from due, paid and due date
- Transaction and payment update in Serializable transaction

## Receipts

- Organization/year sequential numbers (`REC-2026-000001`)
- PostgreSQL sequence row updated transactionally
- PDF generation
- Private R2 storage
- Parent/accountant authorization
- Void with mandatory reason
- Reissue with new sequential number and link to prior receipt
- Receipt failure state when PDF/storage fails
- Voiding a receipt does not erase its payment transaction

## Accountant UI

- Obligation list and filters
- Detail and reconciliation view
- Partial payment form
- Receipt download/void/reissue
- Fee categories
- Financial dashboard
- CSV export
- XLSX export with formatting, frozen header and formula-injection protection

## Parent UI

- Linked/authorized children only
- Gross/net paid/outstanding visibility
- Status and due date
- Issued receipt downloads
- Voided/failed receipts excluded

## Automation

- Daily Inngest overdue sweep
- Pending and Partial obligations become Overdue after due date
- Parent overdue notification
- Audit event
- Idempotent status guard

## No online payment processing

No gateway, card tokenization, checkout or charge API is implemented. All transactions are explicitly manual records as required.

## Remaining verification

- Neon Serializable concurrency test for receipt sequence
- R2 PDF integration test
- Accountant/parent Playwright workflow
- Formal accounting review for Moroccan receipt requirements
- Refund/credit-note model if later required
