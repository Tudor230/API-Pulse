import {
  SQSConfig,
} from './types'


// Environment-specific configurations
const getEnvironmentConfig = (): Partial<SQSConfig> => {
  return {
    region: 'eu-central-1',
    credentials: {}
  }
}

// Complete SQS configuration
export const sqsConfig: SQSConfig = {
  region: getEnvironmentConfig().region!,
  credentials: getEnvironmentConfig().credentials!,
}