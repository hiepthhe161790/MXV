# Event Log - Immutable Audit Trail
# This file documents all events for reference

## Trading System Events

### Account Events
- AccountCreated: New account created with initial balance
- BalanceDeposited: Funds deposited to account
- BalanceWithdrawn: Funds withdrawn from account
- BalanceFrozen: Balance frozen for margin requirement
- BalanceUnfrozen: Frozen balance released

### Order Events
- OrderCreated: Order placed by trader
- OrderValidated: Order passed all validations
- OrderSent: Order submitted to exchange
- OrderFilled: Order completely or partially filled
- OrderCancelled: Order cancelled by trader or system
- OrderRejected: Order rejected by risk engine

### Trade Events
- TradeExecuted: Trade executed between two orders

### Position Events
- PositionOpened: New position opened
- PositionUpdated: Position quantity or price updated
- PriceUpdated: Market price updated
- PositionClosed: Position closed with P&L settled

### Risk Events
- MarginCallTriggered: Account margin dropped below threshold
- AutoLiquidationTriggered: Auto-liquidation initiated due to critical margin

### Settlement Events
- EODSettlementStarted: End-of-day settlement initiated
- EODSettlementCompleted: End-of-day settlement finished
- AccountSettled: Account equity settled for the day

### Audit Events
- AuditLogCreated: Audit log entry for compliance
- ReconciliationFailed: Account reconciliation failed

## Event Sourcing

Each event is immutable and contains:
- eventId: Unique event identifier (UUID)
- aggregateId: Related aggregate (account, order, position)
- eventType: Type of event
- data: Event payload
- timestamp: When event occurred

This forms a complete audit trail and allows replay of state.
