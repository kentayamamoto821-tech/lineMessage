# plugin-line-messaging

LINE Messaging API plugin for Payload CMS v3 with full serverless support.

## Features

- 📱 Send text messages, images, files, and rich content via LINE
- 📨 Broadcast to multiple recipients or all followers
- 📄 Automatic payroll report delivery
- ⚡ Serverless compatible (Vercel, DigitalOcean App Platform, AWS Lambda)
- 🌏 Multi-language support (Traditional Chinese primary)
- 📊 Message history tracking
- 🔘 "Send via LINE" buttons alongside "Send Email" in admin panel

## Installation

```bash
npm install plugin-line-messaging
# or
yarn add plugin-line-messaging
```

## Setup

### 1. Get LINE Credentials

1. Create a [LINE Developers account](https://developers.line.biz/)
2. Create a new Messaging API channel
3. Get your Channel Access Token and Channel Secret

### 2. Configure the Plugin

```typescript
// payload.config.ts
import { buildConfig } from 'payload'
import { lineMessagingPlugin } from 'plugin-line-messaging'

export default buildConfig({
  // ... your config
  plugins: [
    lineMessagingPlugin({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
      channelSecret: process.env.LINE_CHANNEL_SECRET!,
      
      // Serverless configuration
      serverless: {
        platform: 'vercel', // or 'digitalocean', 'aws', 'auto'
      },
      
      // Enable for specific collections
      collections: [
        {
          slug: 'employees',
          lineIdField: 'lineId', // Your existing LINE ID field
          enableSendButton: true,
          enableBroadcast: true,
        },
        {
          slug: 'payroll-reports',
          enableSendButton: true,
        },
      ],
      
      // Message defaults
      messageDefaults: {
        locale: 'tw', // Default to Traditional Chinese
        notificationDisabled: false,
      },
    }),
  ],
})
```

### 3. Environment Variables

```bash
# .env
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LINE_CHANNEL_SECRET=your_channel_secret
```

## Usage

### Send a Simple Message

```typescript
// In a hook or custom endpoint
const { lineService } = req.payload

await lineService.send({
  to: employee.lineId,
  messages: [{
    type: 'text',
    text: '您好！這是來自 Payload CMS 的訊息。'
  }]
})
```

### Send a Payroll Report

```typescript
await lineService.sendPayrollReport({
  to: employee.lineId,
  report: payrollReport,
  locale: 'tw'
})
```

### Broadcast to Multiple Recipients

```typescript
await lineService.broadcast({
  messages: [{
    type: 'text',
    text: '重要通知：明天公司休息一天。'
  }],
  recipients: employees.map(e => ({
    id: e.lineId,
    type: 'user'
  }))
})
```

### Send Files and Images

```typescript
// Send a PDF file
await lineService.sendFile({
  to: employee.lineId,
  fileUrl: 'https://example.com/payroll.pdf',
  fileName: 'Payroll_Report.pdf',
  mimeType: 'application/pdf'
})

// Send an image
await lineService.send({
  to: employee.lineId,
  messages: [{
    type: 'image',
    originalContentUrl: 'https://example.com/image.jpg',
    previewImageUrl: 'https://example.com/image_thumb.jpg'
  }]
})
```

## Admin UI Integration

The plugin automatically adds:

1. **"Send via LINE" button** next to "Send Email" in document actions
2. **LINE delivery status** fields in the sidebar
3. **Message history** collection for tracking

## Serverless Deployment

### Vercel

```json
// vercel.json
{
  "functions": {
    "api/[...path].ts": {
      "maxDuration": 30
    }
  }
}
```

### DigitalOcean App Platform

The plugin automatically detects and configures for DigitalOcean App Platform.

## API Endpoints

The plugin creates these endpoints:

- `POST /api/line/send` - Send a message to a single recipient
- `POST /api/line/broadcast` - Broadcast to multiple recipients

## Message Types

### Text Message
```typescript
{
  type: 'text',
  text: 'Hello, World!'
}
```

### Flex Message (Rich Content)
```typescript
{
  type: 'flex',
  altText: 'Payroll Report',
  contents: { /* Flex message JSON */ }
}
```

### File Message
```typescript
{
  type: 'file',
  fileUrl: 'https://example.com/document.pdf',
  fileName: 'document.pdf'
}
```

## Localization

The plugin supports multiple languages:

- `tw` - Traditional Chinese (default)
- `en` - English
- `ja` - Japanese
- `cn` - Simplified Chinese
- `ko` - Korean
- `es` - Spanish

## Development

```bash
# Clone the repository
git clone https://github.com/yourusername/plugin-line-messaging.git

# Install dependencies
npm install

# Build
npm run build

# Watch for changes
npm run dev

# Run tests
npm test
```

## License

MIT

## Support

For issues and questions, please use [GitHub Issues](https://github.com/yourusername/plugin-line-messaging/issues).