import { PrivateKey } from "@hashgraph/sdk";

export class SecureKeyManager {
  private keys: Map<string, PrivateKey> = new Map();

  loadFromEnvironment(): void {
 
  }

  getKey(keyName: string): PrivateKey {

  }
}