'use client'

import { useState, useEffect } from 'react'
import { Search, Mail, Calendar, User, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface Email {
  id: string
  subject: string
  from: {
    name: string
    address: string
  }
  receivedDateTime: string
  bodyPreview: string
  provider: 'gmail' | 'outlook'
}

interface EmailSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectEmail: (email: Email) => void
}

export default function EmailSelectorModal({ isOpen, onClose, onSelectEmail }: EmailSelectorModalProps) {
  const [emails, setEmails] = useState<Email[]>([])
  const [filteredEmails, setFilteredEmails] = useState<Email[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)

  // Fetch recent emails when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchEmails()
    }
  }, [isOpen])

  // Filter emails based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredEmails(emails)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = emails.filter(email => 
      email.subject.toLowerCase().includes(query) ||
      email.from.name.toLowerCase().includes(query) ||
      email.from.address.toLowerCase().includes(query) ||
      email.bodyPreview.toLowerCase().includes(query)
    )
    setFilteredEmails(filtered)
  }, [searchQuery, emails])

  const fetchEmails = async () => {
    setLoading(true)
    try {
      // Fetch from both Gmail and Outlook
      const [gmailRes, outlookRes] = await Promise.all([
        fetch('/api/gmail/emails', { cache: 'no-store' }).catch(() => null),
        fetch('/api/outlook/emails/delta', { cache: 'no-store' }).catch(() => null)
      ])

      let allEmails: Email[] = []

      if (gmailRes && gmailRes.ok) {
        const gmailData = await gmailRes.json()
        allEmails = [...allEmails, ...(gmailData.emails || [])]
      }

      if (outlookRes && outlookRes.ok) {
        const outlookData = await outlookRes.json()
        const outlookEmails = (outlookData.emails || []).map((email: any) => ({
          id: email.id,
          subject: email.subject,
          from: {
            name: email.from.emailAddress.name,
            address: email.from.emailAddress.address,
          },
          receivedDateTime: email.receivedDateTime,
          bodyPreview: email.bodyPreview,
          provider: 'outlook' as const,
        }))
        allEmails = [...allEmails, ...outlookEmails]
      }

      // Sort by date
      allEmails.sort((a, b) => 
        new Date(b.receivedDateTime).getTime() - new Date(a.receivedDateTime).getTime()
      )

      setEmails(allEmails)
      setFilteredEmails(allEmails)
    } catch (error) {
      console.error('Failed to fetch emails:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectEmail = (email: Email) => {
    onSelectEmail(email)
    onClose()
    setSearchQuery('')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h ago`
    if (hours < 48) return 'Yesterday'
    return date.toLocaleDateString()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[700px] max-h-[85vh] p-0 gap-0 bg-white dark:bg-slate-950 border-2 border-purple-500/20 shadow-2xl shadow-purple-500/20 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-slate-900 dark:to-slate-950 flex-shrink-0">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Select Email to Reply
          </DialogTitle>
          
          {/* Search Bar */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search emails by subject, sender, or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-500 dark:text-slate-400">
              <Mail className="h-12 w-12 mb-2 opacity-50" />
              <p className="text-sm font-medium">
                {searchQuery ? 'No emails found matching your search' : 'No emails found'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-w-full">
              {filteredEmails.map((email) => (
                <button
                  key={`${email.provider}-${email.id}`}
                  onClick={() => handleSelectEmail(email)}
                  className="w-full max-w-full p-3 rounded-lg bg-white dark:bg-slate-900 hover:bg-purple-50 dark:hover:bg-slate-800 transition-all text-left group border border-slate-200 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-600 shadow-sm hover:shadow-md block"
                  style={{ maxWidth: '100%' }}
                >
                  <div className="flex gap-2.5 w-full" style={{ maxWidth: '100%' }}>
                    <Avatar className="h-8 w-8 flex-shrink-0 ring-2 ring-slate-200 dark:ring-slate-700">
                      <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(email.from.name || email.from.address)}&background=random`} />
                      <AvatarFallback className="text-xs bg-gradient-to-br from-purple-500 to-blue-500 text-white">
                        {(email.from.name || email.from.address).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1" style={{ minWidth: 0, maxWidth: 'calc(100% - 44px)' }}>
                      <div className="flex items-start justify-between gap-1.5 mb-1">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors block truncate" style={{ maxWidth: '55%' }}>
                          {email.from.name || email.from.address}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Badge 
                            variant="outline" 
                            className="text-[8px] px-1.5 py-0.5 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 font-semibold"
                          >
                            {email.provider === 'gmail' ? 'GM' : 'OL'}
                          </Badge>
                          <span className="text-[8px] text-slate-500 dark:text-slate-400 font-medium">
                            {formatDate(email.receivedDateTime)}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm font-semibold mb-0.5 text-slate-800 dark:text-slate-200 block truncate" style={{ maxWidth: '100%' }}>
                        {email.subject || '(No subject)'}
                      </p>
                      
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2" style={{ maxWidth: '100%', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                        {email.bodyPreview}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

