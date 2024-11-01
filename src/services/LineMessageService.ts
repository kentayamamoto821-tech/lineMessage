import { Client, ClientConfig, TextMessage, Message } from '@line/bot-sdk'
import type { Payload } from 'payload'
import type { 
  LinePluginConfig, 
  LineMessage, 
  LineBroadcast,
  LineDeliveryStatus 
} from '../types'
import FormData from 'form-data'
import axios from 'axios'
import { tmpdir } from 'os'
import { join } from 'path'
import { writeFileSync, readFileSync, unlinkSync } from 'fs'

export class LineMessageService {
  private client: Client
  private config: LinePluginConfig
  private payload: Payload
  private accessToken: string = ''

  constructor(options: LinePluginConfig & { payload: Payload }) {
    this.config = options
    this.payload = options.payload
    
    // Initialize with async token support for serverless
    this.initializeClient()
  }

  private async initializeClient() {
    // Support dynamic token retrieval for serverless
    if (typeof this.config.channelAccessToken === 'function') {
      this.accessToken = await this.config.channelAccessToken()
    } else {
      this.accessToken = this.config.channelAccessToken
    }

    const channelSecret = typeof this.config.channelSecret === 'function'
      ? await this.config.channelSecret()
      : this.config.channelSecret

    const clientConfig: ClientConfig = {
      channelAccessToken: this.accessToken,
      channelSecret: channelSecret,
    }

    this.client = new Client(clientConfig)
  }

  /**
   * Send a message to a single recipient
   */
  async send(params: {
    to: string
    messages: LineMessage[]
    notificationDisabled?: boolean
  }): Promise<LineDeliveryStatus> {
    try {
      // Ensure client is initialized (important for serverless)
      if (!this.client) {
        await this.initializeClient()
      }

      const lineMessages = await this.convertToLineMessages(params.messages)
      
      const response = await this.client.pushMessage(
        params.to,
        lineMessages,
        params.notificationDisabled
      )

      // Log to database
      await this.logMessage({
        messageId: response['x-line-request-id'] || '',
        type: params.messages[0].type,
        content: params.messages,
        recipients: [params.to],
        status: {
          messageId: response['x-line-request-id'] || '',
          status: 'sent',
          sentAt: new Date(),
        },
      })

      return {
        messageId: response['x-line-request-id'] || '',
        status: 'sent',
        sentAt: new Date(),
      }
    } catch (error: any) {
      console.error('LINE send error:', error)
      throw new Error(`Failed to send LINE message: ${error.message}`)
    }
  }

  /**
   * Broadcast to multiple recipients
   */
  async broadcast(params: LineBroadcast): Promise<LineDeliveryStatus> {
    try {
      if (!this.client) {
        await this.initializeClient()
      }

      const lineMessages = await this.convertToLineMessages(params.messages)
      
      let response: any
      let recipientIds: string[] = []

      if (params.recipients && params.recipients.length > 0) {
        // Multicast to specific recipients
        recipientIds = params.recipients.map(r => r.id)
        response = await this.client.multicast(
          recipientIds,
          lineMessages,
          !params.notification
        )
      } else {
        // Broadcast to all followers
        response = await this.client.broadcast(
          lineMessages,
          !params.notification
        )
        recipientIds = ['broadcast']
      }

      // Log to database
      await this.logMessage({
        messageId: response['x-line-request-id'] || '',
        type: params.messages[0].type,
        content: params.messages,
        recipients: recipientIds,
        status: {
          messageId: response['x-line-request-id'] || '',
          status: 'sent',
          sentAt: new Date(),
        },
      })

      return {
        messageId: response['x-line-request-id'] || '',
        status: 'sent',
        sentAt: new Date(),
      }
    } catch (error: any) {
      console.error('LINE broadcast error:', error)
      throw new Error(`Failed to broadcast LINE message: ${error.message}`)
    }
  }

  /**
   * Send a file (PDF, image, etc.) - Serverless compatible
   */
  async sendFile(params: {
    to: string
    fileUrl?: string
    fileBuffer?: Buffer
    fileName: string
    mimeType: string
    thumbnailUrl?: string
  }): Promise<LineDeliveryStatus> {
    try {
      if (!this.client) {
        await this.initializeClient()
      }

      let contentUrl: string

      // Handle file buffer for serverless (no persistent storage)
      if (params.fileBuffer) {
        // For serverless, we need to upload to a temporary storage
        // This is a simplified version - in production, upload to S3/Cloudinary
        contentUrl = await this.uploadToTemporary(
          params.fileBuffer, 
          params.fileName,
          params.mimeType
        )
      } else if (params.fileUrl) {
        contentUrl = params.fileUrl
      } else {
        throw new Error('Either fileUrl or fileBuffer must be provided')
      }

      let message: Message

      // Determine message type based on MIME type
      if (params.mimeType.startsWith('image/')) {
        message = {
          type: 'image',
          originalContentUrl: contentUrl,
          previewImageUrl: params.thumbnailUrl || contentUrl,
        }
      } else if (params.mimeType.startsWith('video/')) {
        message = {
          type: 'video',
          originalContentUrl: contentUrl,
          previewImageUrl: params.thumbnailUrl || contentUrl,
        }
      } else if (params.mimeType.startsWith('audio/')) {
        message = {
          type: 'audio',
          originalContentUrl: contentUrl,
          duration: 60000, // Default 1 minute, should be calculated
        }
      } else {
        // For PDFs and other files, send as a rich message with download link
        message = {
          type: 'template',
          altText: `File: ${params.fileName}`,
          template: {
            type: 'buttons',
            text: `📎 ${params.fileName}`,
            actions: [
              {
                type: 'uri',
                label: 'Download',
                uri: contentUrl,
              },
            ],
          },
        }
      }

      const response = await this.client.pushMessage(params.to, message)

      return {
        messageId: response['x-line-request-id'] || '',
        status: 'sent',
        sentAt: new Date(),
      }
    } catch (error: any) {
      console.error('LINE sendFile error:', error)
      throw new Error(`Failed to send file via LINE: ${error.message}`)
    }
  }

  /**
   * Send a payroll report
   */
  async sendPayrollReport(params: {
    to: string
    report: any
    locale?: 'tw' | 'en' | 'ja'
  }): Promise<LineDeliveryStatus> {
    const locale = params.locale || 'tw'
    
    const messages = {
      tw: {
        title: '薪資單通知',
        greeting: `您好 ${params.report.employee?.chineseName || ''}`,
        period: `${params.report.year}年${params.report.month}月薪資單`,
        summary: '薪資摘要',
        regularHours: '正常工時',
        overtimeHours: '加班工時',
        basePay: '基本薪資',
        overtimePay: '加班費',
        totalPay: '應發薪資',
        deductions: '扣除額',
        netPay: '實發薪資',
        download: '下載完整薪資單',
      },
      en: {
        title: 'Payroll Report',
        greeting: `Hello ${params.report.employee?.englishName || ''}`,
        period: `Payroll for ${params.report.month}/${params.report.year}`,
        summary: 'Summary',
        regularHours: 'Regular Hours',
        overtimeHours: 'Overtime Hours',
        basePay: 'Base Pay',
        overtimePay: 'Overtime Pay',
        totalPay: 'Gross Pay',
        deductions: 'Deductions',
        netPay: 'Net Pay',
        download: 'Download Full Report',
      },
    }

    const t = messages[locale] || messages.tw

    // Create a flex message for the payroll summary
    const flexMessage: Message = {
      type: 'flex',
      altText: t.title,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: t.title,
              weight: 'bold',
              size: 'xl',
            },
            {
              type: 'text',
              text: t.period,
              size: 'sm',
              color: '#999999',
            },
          ],
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: t.greeting,
              weight: 'bold',
              margin: 'md',
            },
            {
              type: 'separator',
              margin: 'md',
            },
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'md',
              contents: [
                {
                  type: 'text',
                  text: t.regularHours,
                  flex: 2,
                },
                {
                  type: 'text',
                  text: `${params.report.regularHours || 0} hrs`,
                  flex: 1,
                  align: 'end',
                },
              ],
            },
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'sm',
              contents: [
                {
                  type: 'text',
                  text: t.basePay,
                  flex: 2,
                },
                {
                  type: 'text',
                  text: `TWD ${params.report.basePay || 0}`,
                  flex: 1,
                  align: 'end',
                },
              ],
            },
            {
              type: 'separator',
              margin: 'md',
            },
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'md',
              contents: [
                {
                  type: 'text',
                  text: t.netPay,
                  weight: 'bold',
                  flex: 2,
                },
                {
                  type: 'text',
                  text: `TWD ${params.report.netPay || 0}`,
                  weight: 'bold',
                  flex: 1,
                  align: 'end',
                },
              ],
            },
          ],
        },
      },
    }

    return this.send({
      to: params.to,
      messages: [{ type: 'flex', contents: flexMessage.contents, altText: flexMessage.altText }],
    })
  }

  /**
   * Convert plugin message format to LINE SDK format
   */
  private async convertToLineMessages(messages: LineMessage[]): Promise<Message[]> {
    return messages.map(msg => {
      switch (msg.type) {
        case 'text':
          return {
            type: 'text',
            text: msg.text || '',
          } as TextMessage

        case 'image':
          return {
            type: 'image',
            originalContentUrl: msg.originalContentUrl || '',
            previewImageUrl: msg.previewImageUrl || msg.originalContentUrl || '',
          }

        case 'flex':
          return {
            type: 'flex',
            altText: msg.altText || 'Flex Message',
            contents: msg.contents,
          }

        default:
          throw new Error(`Unsupported message type: ${msg.type}`)
      }
    })
  }

  /**
   * Upload file to temporary storage (for serverless)
   */
  private async uploadToTemporary(
    buffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<string> {
    // In production, upload to S3, Cloudinary, or other cloud storage
    // This is a placeholder that returns a data URL for small files
    if (buffer.length > 5 * 1024 * 1024) { // 5MB limit
      throw new Error('File too large for serverless upload. Please use external storage.')
    }

    // Convert to base64 data URL (temporary solution)
    const base64 = buffer.toString('base64')
    return `data:${mimeType};base64,${base64}`
  }

  /**
   * Log message to database
   */
  private async logMessage(params: any): Promise<void> {
    try {
      await this.payload.create({
        collection: 'line-messages',
        data: {
          ...params,
          createdAt: new Date(),
        },
      })
    } catch (error) {
      console.error('Failed to log LINE message:', error)
    }
  }
}