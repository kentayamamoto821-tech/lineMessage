import type { Config, Plugin } from 'payload'
import type { LinePluginConfig } from './types'
import { LineMessageService } from './services/LineMessageService'
import { LineMessagesCollection } from './collections/LineMessages'
import { withLineMessaging } from './middleware/withLineMessaging'
import { SendViaLineButton } from './components/SendViaLineButton'

export const createLinePlugin = (pluginOptions: LinePluginConfig): Plugin => {
  return (incomingConfig: Config): Config => {
    // Validate required options
    if (!pluginOptions.channelAccessToken || !pluginOptions.channelSecret) {
      throw new Error('LINE Plugin: channelAccessToken and channelSecret are required')
    }

    const config = { ...incomingConfig }

    // Add LINE Messages collection for history/tracking
    config.collections = [
      ...(config.collections || []),
      LineMessagesCollection,
    ]

    // Initialize LINE service on Payload init
    config.onInit = async (payload) => {
      // Call original onInit if exists
      if (incomingConfig.onInit) {
        await incomingConfig.onInit(payload)
      }

      // Initialize LINE service with serverless support
      const lineService = new LineMessageService({
        ...pluginOptions,
        payload,
      })

      // Attach to payload instance for global access
      ;(payload as any).lineService = lineService

      // Log initialization
      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ LINE Messaging Plugin initialized')
      }
    }

    // Enhance specified collections with LINE capabilities
    if (pluginOptions.collections && config.collections) {
      pluginOptions.collections.forEach((collectionConfig) => {
        const collection = config.collections?.find(
          (c) => c.slug === collectionConfig.slug
        )

        if (collection) {
          // Add LINE messaging capabilities
          enhanceCollectionWithLine(collection, collectionConfig, pluginOptions)
        }
      })
    }

    // Add serverless-compatible endpoints
    config.endpoints = [
      ...(config.endpoints || []),
      {
        path: '/api/line/send',
        method: 'post',
        handler: async (req, res) => {
          const { payload } = req
          const lineService = (payload as any).lineService
          
          try {
            const result = await lineService.send(req.body)
            res.status(200).json({ success: true, result })
          } catch (error: any) {
            res.status(500).json({ 
              success: false, 
              error: error.message 
            })
          }
        },
      },
      {
        path: '/api/line/broadcast',
        method: 'post',
        handler: async (req, res) => {
          const { payload } = req
          const lineService = (payload as any).lineService
          
          try {
            const result = await lineService.broadcast(req.body)
            res.status(200).json({ success: true, result })
          } catch (error: any) {
            res.status(500).json({ 
              success: false, 
              error: error.message 
            })
          }
        },
      },
    ]

    return config
  }
}

function enhanceCollectionWithLine(
  collection: any,
  collectionConfig: any,
  pluginOptions: LinePluginConfig
) {
  const lineIdField = collectionConfig.lineIdField || 'lineId'
  
  // Check if lineId field already exists (like in Employees)
  const hasLineIdField = collection.fields.some(
    (field: any) => field.name === lineIdField
  )

  // Only add lineId field if it doesn't exist
  if (!hasLineIdField) {
    collection.fields.push({
      name: lineIdField,
      type: 'text',
      label: {
        en: 'LINE ID',
        tw: 'LINE ID',
        cn: 'LINE ID',
        ja: 'LINE ID',
        ko: 'LINE ID',
        es: 'LINE ID',
      },
      admin: {
        position: 'sidebar',
        placeholder: '@username',
        description: 'LINE user ID for messaging',
      },
    })
  }

  // Add Send via LINE button alongside Send Email
  if (collectionConfig.enableSendButton) {
    collection.admin = {
      ...collection.admin,
      components: {
        ...collection.admin?.components,
        BeforeListTable: [
          ...(collection.admin?.components?.BeforeListTable || []),
          SendViaLineButton,
        ],
      },
    }

    // Add LINE send action to document actions
    collection.admin.components.views = {
      ...collection.admin?.components?.views,
      Edit: {
        ...collection.admin?.components?.views?.Edit,
        actions: [
          ...(collection.admin?.components?.views?.Edit?.actions || []),
          SendViaLineButton,
        ],
      },
    }
  }

  // Add hooks for LINE messaging
  collection.hooks = {
    ...collection.hooks,
    afterChange: [
      ...(collection.hooks?.afterChange || []),
      withLineMessaging(pluginOptions, collectionConfig),
    ],
  }

  // For Payroll Reports specifically
  if (collection.slug === 'payroll-reports') {
    // Add custom field for LINE delivery status
    collection.fields.push({
      name: 'lineDeliveryStatus',
      type: 'select',
      label: {
        en: 'LINE Delivery Status',
        tw: 'LINE 傳送狀態',
        cn: 'LINE 发送状态',
      },
      options: [
        { label: { en: 'Not Sent', tw: '未傳送' }, value: 'not_sent' },
        { label: { en: 'Pending', tw: '傳送中' }, value: 'pending' },
        { label: { en: 'Sent', tw: '已傳送' }, value: 'sent' },
        { label: { en: 'Delivered', tw: '已送達' }, value: 'delivered' },
        { label: { en: 'Failed', tw: '傳送失敗' }, value: 'failed' },
      ],
      defaultValue: 'not_sent',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    })

    collection.fields.push({
      name: 'lineSentAt',
      type: 'date',
      label: {
        en: 'LINE Sent At',
        tw: 'LINE 傳送時間',
        cn: 'LINE 发送时间',
      },
      admin: {
        position: 'sidebar',
        readOnly: true,
        date: {
          displayFormat: 'yyyy/MM/dd HH:mm',
        },
      },
    })
  }
}