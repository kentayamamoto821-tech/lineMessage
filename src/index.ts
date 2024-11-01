import type { Config, Plugin } from 'payload'
import type { LinePluginConfig } from './types'
import { createLinePlugin } from './plugin'

export const lineMessagingPlugin = createLinePlugin
export type { LinePluginConfig }

// Re-export types for convenience
export type {
  LineMessage,
  LineMessageType,
  LineRecipient,
  LineBroadcast,
  LineDeliveryStatus,
} from './types'

// Re-export services for direct use if needed
export { LineMessageService } from './services/LineMessageService'