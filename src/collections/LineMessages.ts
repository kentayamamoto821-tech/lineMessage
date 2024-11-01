import type { CollectionConfig } from 'payload'

export const LineMessagesCollection: CollectionConfig = {
  slug: 'line-messages',
  labels: {
    singular: {
      en: 'LINE Message',
      tw: 'LINE 訊息',
      cn: 'LINE 消息',
    },
    plural: {
      en: 'LINE Messages', 
      tw: 'LINE 訊息',
      cn: 'LINE 消息',
    },
  },
  admin: {
    useAsTitle: 'messageId',
    defaultColumns: ['messageId', 'type', 'status', 'createdAt'],
    group: {
      en: 'Communications',
      tw: '通訊',
      cn: '通讯',
    },
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user?.role === 'admin'),
    delete: ({ req: { user } }) => Boolean(user?.role === 'admin'),
  },
  fields: [
    {
      name: 'messageId',
      type: 'text',
      required: true,
      label: {
        en: 'Message ID',
        tw: '訊息 ID',
        cn: '消息 ID',
      },
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      label: {
        en: 'Message Type',
        tw: '訊息類型',
        cn: '消息类型',
      },
      options: [
        { label: { en: 'Text', tw: '文字' }, value: 'text' },
        { label: { en: 'Image', tw: '圖片' }, value: 'image' },
        { label: { en: 'File', tw: '檔案' }, value: 'file' },
        { label: { en: 'Flex', tw: 'Flex' }, value: 'flex' },
        { label: { en: 'Template', tw: '範本' }, value: 'template' },
      ],
    },
    {
      name: 'content',
      type: 'json',
      label: {
        en: 'Message Content',
        tw: '訊息內容',
        cn: '消息内容',
      },
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'recipients',
      type: 'json',
      label: {
        en: 'Recipients',
        tw: '收件人',
        cn: '收件人',
      },
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      label: {
        en: 'Status',
        tw: '狀態',
        cn: '状态',
      },
      options: [
        { label: { en: 'Pending', tw: '待發送' }, value: 'pending' },
        { label: { en: 'Sent', tw: '已發送' }, value: 'sent' },
        { label: { en: 'Delivered', tw: '已送達' }, value: 'delivered' },
        { label: { en: 'Failed', tw: '失敗' }, value: 'failed' },
      ],
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'sentAt',
      type: 'date',
      label: {
        en: 'Sent At',
        tw: '發送時間',
        cn: '发送时间',
      },
      admin: {
        readOnly: true,
        date: {
          displayFormat: 'yyyy/MM/dd HH:mm:ss',
        },
      },
    },
    {
      name: 'deliveredAt',
      type: 'date',
      label: {
        en: 'Delivered At',
        tw: '送達時間',
        cn: '送达时间',
      },
      admin: {
        readOnly: true,
        date: {
          displayFormat: 'yyyy/MM/dd HH:mm:ss',
        },
      },
    },
    {
      name: 'error',
      type: 'text',
      label: {
        en: 'Error Message',
        tw: '錯誤訊息',
        cn: '错误消息',
      },
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'sender',
      type: 'relationship',
      relationTo: 'users',
      label: {
        en: 'Sent By',
        tw: '發送者',
        cn: '发送者',
      },
      admin: {
        readOnly: true,
      },
    },
  ],
  timestamps: true,
}