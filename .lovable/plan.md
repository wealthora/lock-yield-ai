# Wealthora–KitePay integration

## Scope
Preserve Wealthora's current authentication, investment calculations, dashboard design, and financial history. Use the existing `wallets`, `deposit_requests`, `withdrawal_requests`, and `activities` records as the user-facing accounting/history sources; do not add a second balance or duplicate transaction entry. Add only the transfer correlation/idempotency data needed to safely coordinate KitePay state and delivery attempts.

## Implementation
1. Add a small, auditable transfer record and atomic database operations for validated state transitions, withdrawal reservation/release/finalization, deposit credit, and compensating reversal. Keep KitePay reservations separate from investment `locked_balance`; make retries and concurrent requests safe.
2. Add server-side KitePay endpoints for identity validation, account/balance reads, deposit/withdrawal coordination, transfer status, and signed callbacks. Enforce authenticated customer identity or KitePay HMAC-SHA256 signing, timestamps/expiry, idempotency, amount/currency checks, replay protection, request limits, ownership, and audit events. Never expose private keys in browser code.
3. Narrowly remove customer-side direct wallet editing and route existing bot allocations through an atomic balance operation, retaining their current plan rules and outcomes so they cannot bypass KitePay reservations.
4. Add KitePay to the existing deposit/withdrawal choices and customer history/status details; add a focused admin transfer view for reference search, status, failure, callback delivery, and reconciliation review. No unrestricted balance-editing controls.
5. Document endpoint schemas, signing, secret setup, database changes, and test results. Run deterministic security/state tests and integration tests only against a non-production environment; do not create fake successful financial records in production.

## Dependencies and completion gate
The existing KitePay API contract and customer-linking field are not available in this workspace. Use the supplied KitePay specification if provided; otherwise publish a versioned contract for KitePay to implement. Request the shared HMAC secret only after the Wealthora endpoints exist. Do not report the integration complete until KitePay is connected and successful end-to-end sandbox tests cover the requested failure, retry, reversal, and concurrency cases. If KitePay access or a sandbox is unavailable, document the remaining blocker clearly.
