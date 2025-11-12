export interface EncryptedData {
  encrypted: string;  // hex-encoded ciphertext
  iv: string;         // hex-encoded initialization vector
  authTag: string;    // hex-encoded authentication tag
}

export interface HEContextParams {
  poly_modulus_degree: number;
  coeff_mod_bit_sizes: number[];
  scale: number;
}

export interface HEContext {
  context_params: HEContextParams;
  serialized_context: string;
}

export interface HEKeys {
  publicKey: string;   // base64-encoded
  privateKey: string;  // base64-encoded
}

export interface EncryptedMetric {
  metric_type: string;
  encrypted_value: Uint8Array;  // CKKS ciphertext
  timestamp: Date;
}

export interface AggregateQuery {
  metric_type: string;
  operation: 'sum' | 'average';
  time_range?: {
    start: Date;
    end: Date;
  };
}

export interface AggregateResult {
  encrypted_result: Uint8Array;
  count: number;
  operation: string;
}
