// src/services/hedera/HCSService.ts - FINAL PRODUCTION VERSION
import {TopicMessageSubmitTransaction, TopicMessageQuery} from '@hashgraph/sdk';
import {getHederaClient, HEDERA_CONFIG} from '../../config/hedera.config';
import {walletService} from '../hedera/WalletService';
import {
  GovernanceMessage,
  ServiceQualityMessage,
  EnergyTradeMessage,
} from '../../store/types';

class HCSService {
  private client = getHederaClient();
  private subscriptions: Map<string, any> = new Map();

  // ==================== GOVERNANCE TOPIC ====================

  async submitGovernanceAction(action: GovernanceMessage): Promise<string> {
    const account = walletService.getCurrentAccount();
    if (!account) throw new Error('No wallet connected');

    try {
      const transaction = await new TopicMessageSubmitTransaction()
        .setTopicId(HEDERA_CONFIG.topics.governance)
        .setMessage(JSON.stringify(action))
        .freezeWith(this.client);

      const signedTx = await walletService.signTransaction(transaction);
      const response = await signedTx.execute(this.client);
      await response.getReceipt(this.client);

      return response.transactionId.toString();
    } catch (error) {
      console.error('Error submitting governance action:', error);
      throw new Error(`Failed to submit governance action: ${error}`);
    }
  }

  async subscribeToGovernance(
    callback: (message: GovernanceMessage) => void,
    startTime?: Date,
  ): Promise<void> {
    try {
      const subscription = new TopicMessageQuery()
        .setTopicId(HEDERA_CONFIG.topics.governance)
        .setStartTime(startTime || new Date(Date.now() - 24 * 60 * 60 * 1000))
        .subscribe(
          this.client,
          null,
          message => {
            try {
              const data: GovernanceMessage = JSON.parse(
                message.contents.toString(),
              );
              callback(data);
            } catch (error) {
              console.error('Error parsing governance message:', error);
            }
          },
        );

      this.subscriptions.set('governance', subscription);
    } catch (error) {
      console.error('Error subscribing to governance topic:', error);
      throw error;
    }
  }

  async getGovernanceHistory(
    limit: number = 100,
  ): Promise<GovernanceMessage[]> {
    try {
      const response = await fetch(
        `${HEDERA_CONFIG.mirrorNodeUrl}/api/v1/topics/${HEDERA_CONFIG.topics.governance}/messages?limit=${limit}&order=desc`,
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();

      return (data.messages || []).map((msg: any) => {
        const decoded = Buffer.from(msg.message, 'base64').toString('utf8');
        return JSON.parse(decoded);
      });
    } catch (error) {
      console.error('Error fetching governance history:', error);
      return [];
    }
  }

  // ==================== SERVICE QUALITY TOPIC ====================

  async submitServiceQuality(data: ServiceQualityMessage): Promise<string> {
    const account = walletService.getCurrentAccount();
    if (!account) throw new Error('No wallet connected');

    try {
      const transaction = await new TopicMessageSubmitTransaction()
        .setTopicId(HEDERA_CONFIG.topics.serviceQuality)
        .setMessage(JSON.stringify(data))
        .setMaxChunks(10)
        .freezeWith(this.client);

      const signedTx = await walletService.signTransaction(transaction);
      const response = await signedTx.execute(this.client);
      await response.getReceipt(this.client);

      return response.transactionId.toString();
    } catch (error) {
      console.error('Error submitting service quality:', error);
      throw new Error(`Failed to submit service quality: ${error}`);
    }
  }

  async subscribeToServiceQuality(
    providerId: string,
    callback: (message: ServiceQualityMessage) => void,
  ): Promise<void> {
    try {
      const subscription = new TopicMessageQuery()
        .setTopicId(HEDERA_CONFIG.topics.serviceQuality)
        .setStartTime(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        .subscribe(
          this.client,
          null,
          message => {
            try {
              const data: ServiceQualityMessage = JSON.parse(
                message.contents.toString(),
              );

              if (data.providerId === providerId) {
                callback(data);
              }
            } catch (error) {
              console.error('Error parsing service quality message:', error);
            }
          },
        );

      this.subscriptions.set('serviceQuality', subscription);
    } catch (error) {
      console.error('Error subscribing to service quality:', error);
      throw error;
    }
  }

  async getProviderQualityMetrics(
    providerId: string,
    limit: number = 50,
  ): Promise<ServiceQualityMessage[]> {
    try {
      const response = await fetch(
        `${HEDERA_CONFIG.mirrorNodeUrl}/api/v1/topics/${HEDERA_CONFIG.topics.serviceQuality}/messages?limit=${limit}&order=desc`,
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();

      return (data.messages || [])
        .map((msg: any) => {
          const decoded = Buffer.from(msg.message, 'base64').toString('utf8');
          return JSON.parse(decoded);
        })
        .filter((msg: ServiceQualityMessage) => msg.providerId === providerId);
    } catch (error) {
      console.error('Error fetching quality metrics:', error);
      return [];
    }
  }

  // ==================== ENERGY TRADING TOPIC ====================

  async submitEnergyTrade(trade: EnergyTradeMessage): Promise<string> {
    const account = walletService.getCurrentAccount();
    if (!account) throw new Error('No wallet connected');

    try {
      const transaction = await new TopicMessageSubmitTransaction()
        .setTopicId(HEDERA_CONFIG.topics.energyTrading)
        .setMessage(JSON.stringify(trade))
        .freezeWith(this.client);

      const signedTx = await walletService.signTransaction(transaction);
      const response = await signedTx.execute(this.client);
      await response.getReceipt(this.client);

      return response.transactionId.toString();
    } catch (error) {
      console.error('Error submitting energy trade:', error);
      throw new Error(`Failed to submit energy trade: ${error}`);
    }
  }

  async subscribeToEnergyTrading(
    callback: (message: EnergyTradeMessage) => void,
  ): Promise<void> {
    try {
      const subscription = new TopicMessageQuery()
        .setTopicId(HEDERA_CONFIG.topics.energyTrading)
        .setStartTime(new Date(Date.now() - 24 * 60 * 60 * 1000))
        .subscribe(
          this.client,
          null,
          message => {
            try {
              const data: EnergyTradeMessage = JSON.parse(
                message.contents.toString(),
              );
              callback(data);
            } catch (error) {
              console.error('Error parsing energy trade message:', error);
            }
          },
        );

      this.subscriptions.set('energyTrading', subscription);
    } catch (error) {
      console.error('Error subscribing to energy trading:', error);
      throw error;
    }
  }

  async getRecentEnergyTrades(
    limit: number = 100,
  ): Promise<EnergyTradeMessage[]> {
    try {
      const response = await fetch(
        `${HEDERA_CONFIG.mirrorNodeUrl}/api/v1/topics/${HEDERA_CONFIG.topics.energyTrading}/messages?limit=${limit}&order=desc`,
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();

      return (data.messages || []).map((msg: any) => {
        const decoded = Buffer.from(msg.message, 'base64').toString('utf8');
        return JSON.parse(decoded);
      });
    } catch (error) {
      console.error('Error fetching energy trades:', error);
      return [];
    }
  }

  // ==================== UTILITY METHODS ====================

  async unsubscribeAll(): Promise<void> {
    this.subscriptions.forEach(subscription => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    });
    this.subscriptions.clear();
  }

  async unsubscribeFrom(
    topic: 'governance' | 'serviceQuality' | 'energyTrading',
  ): Promise<void> {
    const subscription = this.subscriptions.get(topic);
    if (subscription && typeof subscription.unsubscribe === 'function') {
      subscription.unsubscribe();
      this.subscriptions.delete(topic);
    }
  }
}

export const hcsService = new HCSService();