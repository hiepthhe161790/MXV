const AggregateRoot = require('../../../shared/domain/AggregateRoot');
const DomainEvent = require('../../../shared/domain/DomainEvent');

/**
 * Account Aggregate Root
 * Manages all account-related domain logic
 * Events: AccountCreated, BalanceDeposited, BalanceWithdrawn, BalanceFrozen, BalanceUnfrozen
 */
class Account extends AggregateRoot {
  constructor(id, email, balance = 0, frozenBalance = 0) {
    super(id);
    this.email = email;
    this.balance = balance;
    this.frozenBalance = frozenBalance;
    this.createdAt = new Date();
    this.isActive = true;
  }

  static create(id, email, initialBalance = 0) {
    const account = new Account(id, email);
    
    account.raiseEvent(new DomainEvent(
      id,
      'AccountCreated',
      { email, balance: initialBalance },
      new Date()
    ));
    
    if (initialBalance > 0) {
      account.raiseEvent(new DomainEvent(
        id,
        'BalanceDeposited',
        { amount: initialBalance, reason: 'Initial deposit' },
        new Date()
      ));
    }
    
    return account;
  }

  deposit(amount, reason = 'Deposit') {
    if (amount <= 0) throw new Error('Deposit amount must be positive');
    
    this.raiseEvent(new DomainEvent(
      this.id,
      'BalanceDeposited',
      { amount, reason, balance: this.balance + amount }
    ));
  }

  withdraw(amount, reason = 'Withdrawal', allowNegative = false) {
    if (amount <= 0) throw new Error('Withdrawal amount must be positive');
    if (!allowNegative && this.getAvailableBalance() < amount) {
      throw new Error('Insufficient available balance');
    }
    
    this.raiseEvent(new DomainEvent(
      this.id,
      'BalanceWithdrawn',
      { amount, reason, balance: this.balance - amount }
    ));
  }

  freezeBalance(amount, reason = 'Margin requirement') {
    if (amount <= 0) throw new Error('Freeze amount must be positive');
    if (this.getAvailableBalance() < amount) {
      throw new Error('Insufficient balance to freeze');
    }
    
    this.raiseEvent(new DomainEvent(
      this.id,
      'BalanceFrozen',
      { amount, reason, frozenBalance: this.frozenBalance + amount }
    ));
  }

  unfreezeBalance(amount, reason = 'Margin release') {
    if (amount <= 0) throw new Error('Unfreeze amount must be positive');
    if (this.frozenBalance < amount) {
      throw new Error('Cannot unfreeze more than frozen amount');
    }
    
    this.raiseEvent(new DomainEvent(
      this.id,
      'BalanceUnfrozen',
      { amount, reason, frozenBalance: this.frozenBalance - amount }
    ));
  }

  getAvailableBalance() {
    return this.balance - this.frozenBalance;
  }

  getTotalEquity() {
    return this.balance;
  }

  applyEvent(event) {
    switch (event.eventType) {
      case 'AccountCreated':
        this.email = event.data.email;
        this.balance = event.data.balance || 0;
        this.frozenBalance = 0;
        break;
      
      case 'BalanceDeposited':
        this.balance += event.data.amount;
        break;
      
      case 'BalanceWithdrawn':
        this.balance -= event.data.amount;
        break;
      
      case 'BalanceFrozen':
        this.frozenBalance += event.data.amount;
        break;
      
      case 'BalanceUnfrozen':
        this.frozenBalance -= event.data.amount;
        break;
    }
  }

  toJSON() {
    return {
      id: this.id,
      email: this.email,
      balance: this.balance,
      frozenBalance: this.frozenBalance,
      availableBalance: this.getAvailableBalance(),
      totalEquity: this.getTotalEquity(),
      isActive: this.isActive,
      createdAt: this.createdAt,
    };
  }
}

module.exports = Account;
