import { PrivateKey } from "@hashgraph/sdk";

export class SecureKeyManager {
  private keys: Map<string, PrivateKey> = new Map();

  loadFromEnvironment(): void {
 
  }

  getKey(keyName: string): PrivateKey {
    const key = this.keys.get(keyName);
    if (!key) {
      throw new Error(`Key not found: ${keyName}`);
    }
    return key;
  }
}