import type { CollectionConfig } from 'payload'

export interface LinePluginConfig {
  enabled?: boolean
  channelAccessToken: string | (() => string | Promise<string>)
  channelSecret: string | (() => string | Promise<string>)
  
  // Serverless configuration
  serverless?: {
    platform?: 'vercel' | 'digitalocean' | 'aws' | 'auto'
    tempDirectory?: string // For file uploads in serverless
  }
  
  // Collections to enable LINE messaging for
  collections?: {
    slug: string
    lineIdField?: string // Field name for LINE ID (default: 'lineId')
    enableBroadcast?: boolean
    enableSendButton?: boolean
  }[]
  
  // Message configuration
  messageDefaults?: {
    locale?: 'tw' | 'en' | 'ja' | 'cn' | 'ko' | 'es'
    notificationDisabled?: boolean // Silent messages
  }
  
  // File handling for serverless
  fileHandler?: {
    uploadDir?: string
    maxFileSize?: number // in MB
    allowedMimeTypes?: string[]
  }
  
  // UI Components
  components?: {
    sendButton?: React.ComponentType<any>
    messageComposer?: React.ComponentType<any>
  }
}

export type LineMessageType = 
  | 'text' 
  | 'image' 
  | 'video' 
  | 'audio' 
  | 'file' 
  | 'location' 
  | 'sticker' 
  | 'template' 
  | 'flex'

export interface LineMessage {
  type: LineMessageType
  text?: string
  packageId?: string
  stickerId?: string
  originalContentUrl?: string
  previewImageUrl?: string
  title?: string
  address?: string
  latitude?: number
  longitude?: number
  fileName?: string
  fileSize?: number
  altText?: string
  template?: any
  contents?: any // For flex messages
}

export interface LineRecipient {
  id: string
  type: 'user' | 'group' | 'room'
  displayName?: string
}

export interface LineBroadcast {
  messages: LineMessage[]
  recipients?: LineRecipient[] // If not specified, send to all
  notification?: boolean
}

export interface LineDeliveryStatus {
  messageId: string
  status: 'pending' | 'sent' | 'delivered' | 'failed'
  sentAt?: Date
  deliveredAt?: Date
  error?: string
  recipients?: {
    id: string
    status: 'sent' | 'delivered' | 'failed'
    error?: string
  }[]
}

export interface LineMessageHistory {
  id: string
  messageId: string
  type: LineMessageType
  content: any
  recipients: string[]
  sender?: string
  status: LineDeliveryStatus
  createdAt: Date
  updatedAt: Date
}