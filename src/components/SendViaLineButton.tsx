'use client'

import React, { useState } from 'react'
import { useModal, useDrawerSlug, Button, Drawer, toast } from '@payloadcms/ui'

interface SendViaLineButtonProps {
  doc?: any
  collection?: string
}

export const SendViaLineButton: React.FC<SendViaLineButtonProps> = ({ 
  doc, 
  collection 
}) => {
  const [sending, setSending] = useState(false)
  const drawerSlug = useDrawerSlug('send-via-line')
  const { toggleModal } = useModal()
  
  // Don't show button if no LINE ID
  if (!doc?.lineId && !doc?.employee?.lineId) {
    return null
  }

  const handleSendViaLine = async () => {
    setSending(true)
    
    try {
      // Determine the LINE ID based on collection
      let lineId = ''
      let message = ''
      
      if (collection === 'payroll-reports') {
        lineId = doc.employee?.lineId
        message = `Payroll report for ${doc.month}/${doc.year}`
      } else if (collection === 'employees') {
        lineId = doc.lineId
        message = 'Test message from Payload CMS'
      } else {
        lineId = doc.lineId || doc.employee?.lineId
        message = 'Document update notification'
      }

      if (!lineId) {
        toast.error('No LINE ID found for this record')
        return
      }

      // Send via API endpoint
      const response = await fetch('/api/line/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: lineId,
          messages: [{
            type: 'text',
            text: message,
          }],
        }),
      })

      if (response.ok) {
        toast.success('Message sent via LINE!')
        
        // Update delivery status if it's a payroll report
        if (collection === 'payroll-reports' && doc.id) {
          await fetch(`/api/payroll-reports/${doc.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              lineDeliveryStatus: 'sent',
              lineSentAt: new Date().toISOString(),
            }),
          })
        }
      } else {
        const error = await response.json()
        toast.error(`Failed to send: ${error.message}`)
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`)
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <Button
        buttonStyle="secondary"
        size="small"
        onClick={handleSendViaLine}
        disabled={sending}
      >
        {sending ? 'Sending...' : '📱 Send via LINE'}
      </Button>
    </>
  )
}

// Advanced composer for batch sending
export const LineMessageComposer: React.FC<{
  recipients: any[]
  onClose: () => void
}> = ({ recipients, onClose }) => {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  
  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message')
      return
    }

    setSending(true)
    
    try {
      // Get all LINE IDs
      const lineIds = recipients
        .map(r => r.lineId || r.employee?.lineId)
        .filter(Boolean)
      
      if (lineIds.length === 0) {
        toast.error('No recipients have LINE IDs')
        return
      }

      // Send broadcast
      const response = await fetch('/api/line/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{
            type: 'text',
            text: message,
          }],
          recipients: lineIds.map(id => ({ id, type: 'user' })),
        }),
      })

      if (response.ok) {
        toast.success(`Message sent to ${lineIds.length} recipients via LINE!`)
        onClose()
      } else {
        const error = await response.json()
        toast.error(`Failed to send: ${error.message}`)
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`)
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <h3>Send LINE Message</h3>
      <p>Sending to {recipients.length} recipient(s)</p>
      
      <div style={{ marginTop: '20px' }}>
        <label>
          Message:
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            style={{ 
              width: '100%', 
              marginTop: '10px',
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #ddd',
            }}
            placeholder="Enter your message here..."
          />
        </label>
      </div>

      <div style={{ 
        marginTop: '20px', 
        display: 'flex', 
        gap: '10px',
        justifyContent: 'flex-end' 
      }}>
        <Button
          buttonStyle="secondary"
          onClick={onClose}
          disabled={sending}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSend}
          disabled={sending || !message.trim()}
        >
          {sending ? 'Sending...' : 'Send via LINE'}
        </Button>
      </div>
    </div>
  )
}