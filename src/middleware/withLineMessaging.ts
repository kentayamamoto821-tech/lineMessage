import type { CollectionAfterChangeHook } from 'payload'

export const withLineMessaging = (
  pluginOptions: any,
  collectionConfig: any
): CollectionAfterChangeHook => {
  return async ({ doc, req, operation }) => {
    // Only send on specific operations
    if (operation !== 'create' && operation !== 'update') {
      return doc
    }

    // Check if LINE messaging is enabled for this collection
    if (!collectionConfig.enableSendButton) {
      return doc
    }

    // Auto-send for specific collections
    const lineService = (req.payload as any).lineService
    
    if (!lineService) {
      console.warn('LINE service not initialized')
      return doc
    }

    // Handle Payroll Reports
    if (req.collection?.config.slug === 'payroll-reports') {
      // Auto-send when status changes to 'approved'
      if (doc.status === 'approved' && doc.employee?.lineId) {
        try {
          await lineService.sendPayrollReport({
            to: doc.employee.lineId,
            report: doc,
            locale: 'tw',
          })
          
          // Update the document with LINE status
          await req.payload.update({
            collection: 'payroll-reports',
            id: doc.id,
            data: {
              lineDeliveryStatus: 'sent',
              lineSentAt: new Date(),
            },
          })
        } catch (error) {
          console.error('Failed to send payroll report via LINE:', error)
        }
      }
    }

    return doc
  }
}