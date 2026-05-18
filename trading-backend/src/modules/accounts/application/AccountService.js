const Account = require('../domain/Account');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../../shared/infrastructure/Logger');

/**
 * Account Service - Application Layer
 * Handles use cases like CreateAccount, Deposit, Withdraw
 */
class AccountService {
  constructor(accountRepository, eventBus, cache) {
    this.accountRepository = accountRepository;
    this.eventBus = eventBus;
    this.cache = cache;
  }

  async createAccount(email, initialBalance = 0) {
    try {
      const accountId = uuidv4();
      const account = Account.create(accountId, email, initialBalance);
      
      // Persist to repository
      await this.accountRepository.save(account);
      
      // Publish events to event bus
      for (const event of account.getUncommittedEvents()) {
        await this.eventBus.publish(event);
      }
      account.markEventsAsCommitted();
      
      // Cache the account
      await this.cache.set(`account:${accountId}`, account.toJSON());
      
      logger.info(`Account created: ${accountId} for ${email}`);
      return account.toJSON();
    } catch (error) {
      logger.error('Error creating account:', error);
      throw error;
    }
  }

  async deposit(accountId, amount, reason = 'Deposit') {
    try {
      // Get account from cache or repository
      let accountData = await this.cache.get(`account:${accountId}`);
      if (!accountData) {
        accountData = await this.accountRepository.findById(accountId);
      }
      
      if (!accountData) throw new Error('Account not found');
      
      // Reconstruct account aggregate and apply deposit
      const account = new Account(
        accountData._id || accountData.id,
        accountData.email,
        accountData.balance,
        accountData.frozenBalance
      );
      
      account.deposit(amount, reason);
      
      // Persist changes
      await this.accountRepository.save(account);
      
      // Publish events
      for (const event of account.getUncommittedEvents()) {
        await this.eventBus.publish(event);
      }
      account.markEventsAsCommitted();
      
      // Update cache
      await this.cache.set(`account:${accountId}`, account.toJSON());
      
      logger.info(`Deposit: ${accountId} - Amount: ${amount}`);
      return account.toJSON();
    } catch (error) {
      logger.error('Error depositing funds:', error);
      throw error;
    }
  }

  async withdraw(accountId, amount, reason = 'Withdrawal') {
    try {
      let accountData = await this.cache.get(`account:${accountId}`);
      if (!accountData) {
        accountData = await this.accountRepository.findById(accountId);
      }
      
      if (!accountData) throw new Error('Account not found');
      
      const account = new Account(
        accountData._id || accountData.id,
        accountData.email,
        accountData.balance,
        accountData.frozenBalance
      );
      
      account.withdraw(amount, reason);
      
      await this.accountRepository.save(account);
      
      for (const event of account.getUncommittedEvents()) {
        await this.eventBus.publish(event);
      }
      account.markEventsAsCommitted();
      
      await this.cache.set(`account:${accountId}`, account.toJSON());
      
      logger.info(`Withdrawal: ${accountId} - Amount: ${amount}`);
      return account.toJSON();
    } catch (error) {
      logger.error('Error withdrawing funds:', error);
      throw error;
    }
  }

  async freezeBalance(accountId, amount, reason = 'Margin requirement') {
    try {
      let accountData = await this.cache.get(`account:${accountId}`);
      if (!accountData) {
        accountData = await this.accountRepository.findById(accountId);
      }
      
      if (!accountData) throw new Error('Account not found');
      
      const account = new Account(
        accountData._id || accountData.id,
        accountData.email,
        accountData.balance,
        accountData.frozenBalance
      );
      
      account.freezeBalance(amount, reason);
      
      await this.accountRepository.save(account);
      
      for (const event of account.getUncommittedEvents()) {
        await this.eventBus.publish(event);
      }
      account.markEventsAsCommitted();
      
      await this.cache.set(`account:${accountId}`, account.toJSON());
      
      logger.info(`Balance frozen: ${accountId} - Amount: ${amount}`);
      return account.toJSON();
    } catch (error) {
      logger.error('Error freezing balance:', error);
      throw error;
    }
  }

  async unfreezeBalance(accountId, amount, reason = 'Margin release') {
    try {
      let accountData = await this.cache.get(`account:${accountId}`);
      if (!accountData) {
        accountData = await this.accountRepository.findById(accountId);
      }
      
      if (!accountData) throw new Error('Account not found');
      
      const account = new Account(
        accountData._id || accountData.id,
        accountData.email,
        accountData.balance,
        accountData.frozenBalance
      );
      
      account.unfreezeBalance(amount, reason);
      
      await this.accountRepository.save(account);
      
      for (const event of account.getUncommittedEvents()) {
        await this.eventBus.publish(event);
      }
      account.markEventsAsCommitted();
      
      await this.cache.set(`account:${accountId}`, account.toJSON());
      
      logger.info(`Balance unfrozen: ${accountId} - Amount: ${amount}`);
      return account.toJSON();
    } catch (error) {
      logger.error('Error unfreezing balance:', error);
      throw error;
    }
  }

  async getAccount(accountId) {
    try {
      let accountData = await this.cache.get(`account:${accountId}`);
      if (!accountData) {
        accountData = await this.accountRepository.findById(accountId);
        if (accountData) {
          await this.cache.set(`account:${accountId}`, accountData);
        }
      }
      return accountData;
    } catch (error) {
      logger.error('Error retrieving account:', error);
      throw error;
    }
  }
}

module.exports = AccountService;
