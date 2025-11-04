'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Send, Sparkles, Bot, User, Loader2, Zap, Mail, ExternalLink, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import EmailSelectorModal from '@/components/email-selector-modal'
import EmailDraftComponent from '@/components/email-draft-component'
import JiraTicketCreator from '@/components/jira-ticket-creator'
import { AIConsentDialog } from '@/components/ai-consent-dialog'

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

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  toolCall?: {
    name: string
    status: 'pending' | 'success' | 'error'
  }
  draftEmail?: {
    content: string
    emailId: string
    provider: 'gmail' | 'outlook'
    subject: string
  }
  newEmail?: {
    content: string
    to: string
    subject: string
    provider: 'gmail' | 'outlook'
  }
  jiraTicket?: {
    title: string
    description: string
    priority: string
    key?: string
    url?: string
    showCreator?: boolean
  }
}

interface AIChatDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export default function AIChatDrawer({ isOpen, onClose }: AIChatDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your AI assistant. I can help you with:\n\n• Creating Jira tickets\n• Drafting email responses\n• Composing new emails\n• Extracting tasks from conversations\n• Scheduling meetings\n\nWhat would you like to do?",
      timestamp: new Date(),
    }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [showEmailSelector, setShowEmailSelector] = useState(false)
  const [consentDialogOpen, setConsentDialogOpen] = useState(false)
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
      }, 100)
    }
  }, [messages])

  // Focus input when drawer opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    }
    
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsTyping(true)
    
    try {
      // Call AI API
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          selectedEmail,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        
        // Check if consent is required
        if (error.code === 'AI_CONSENT_REQUIRED') {
          setPendingMessage(input)
          setConsentDialogOpen(true)
          return
        }
        
        throw new Error('AI request failed')
      }

      const data = await response.json()
      
      // Check if AI wants to call a tool
      if (data.toolCall) {
        await handleToolCall(data.toolCall, data.message)
      } else {
        // Regular AI response
        const aiMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, aiMessage])
      }
    } catch (error) {
      console.error('AI chat error:', error)
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const handleToolCall = async (toolCall: { name: string; arguments: any }, message: string) => {
    if (toolCall.name === 'reply_to_email') {
      // If no email is selected, prompt user to select one
      if (!selectedEmail) {
        setShowEmailSelector(true)
        const aiMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Please select an email to reply to.',
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, aiMessage])
        return
      }

      // Store the email we're replying to and clear the selection
      const emailToReplyTo = { ...selectedEmail }
      setSelectedEmail(null) // Clear selection after capturing

      // Generate AI reply
      try {
        const tone = toolCall.arguments.tone || 'professional'
        const instructions = toolCall.arguments.additionalInstructions || ''
        
        // Fetch full email content
        const emailResponse = await fetch(
          `/api/mail/email?id=${emailToReplyTo.id}&provider=${emailToReplyTo.provider}`
        )
        
        if (!emailResponse.ok) {
          throw new Error('Failed to fetch email')
        }

        const emailData = await emailResponse.json()
        
        // Generate reply using Gemini
        const replyResponse = await fetch('/api/ai/generate-reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emailSubject: emailToReplyTo.subject,
            emailBody: emailData.bodyText || emailData.bodyHtml || emailToReplyTo.bodyPreview,
            from: emailToReplyTo.from,
            tone,
            additionalInstructions: instructions,
          }),
        })

        if (!replyResponse.ok) {
          throw new Error('Failed to generate reply')
        }

        const { reply } = await replyResponse.json()

        // Show draft in chat
        const aiMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: message || `I've drafted a ${tone} reply to "${emailToReplyTo.subject}":`,
          timestamp: new Date(),
          draftEmail: {
            content: reply,
            emailId: emailToReplyTo.id,
            provider: emailToReplyTo.provider,
            subject: emailToReplyTo.subject,
          },
        }
        
        setMessages(prev => [...prev, aiMessage])
      } catch (error) {
        console.error('Error generating reply:', error)
        const errorMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Sorry, I couldn\'t generate a reply. Please try again.',
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } else if (toolCall.name === 'compose_new_email') {
      // Compose new email
      const to = toolCall.arguments.to
      const subject = toolCall.arguments.subject
      const context = toolCall.arguments.context
      const tone = toolCall.arguments.tone || 'professional'

      // If missing recipient, ask for it
      if (!to) {
        const aiMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Who would you like to send this email to? Please provide their email address.',
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, aiMessage])
        return
      }

      // Generate email
      setIsTyping(true)
      try {
        const response = await fetch('/api/ai/compose-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to,
            subject,
            context,
            tone,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to compose email')
        }

        const { body: emailBody, subject: generatedSubject } = await response.json()

        // Show draft in chat
        const aiMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: message || `I've drafted ${tone === 'professional' ? 'a professional' : 'a ' + tone} email to ${to}:`,
          timestamp: new Date(),
          newEmail: {
            content: emailBody,
            to,
            subject: subject || generatedSubject,
            provider: 'gmail', // Default to Gmail, will select in send component
          },
        }

        setMessages(prev => [...prev, aiMessage])
      } catch (error) {
        console.error('Error composing email:', error)
        const errorMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Sorry, I couldn\'t compose the email. Please try again.',
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, errorMessage])
      } finally {
        setIsTyping(false)
      }
    } else if (toolCall.name === 'create_jira_ticket') {
      // Show Jira ticket creation UI
      const title = toolCall.arguments.title || ''
      const description = toolCall.arguments.description || ''
      const priority = toolCall.arguments.priority || 'Medium'

      const aiMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: message || `I'll help you create a Jira ticket. Please review and edit the details:`,
        timestamp: new Date(),
        jiraTicket: {
          title,
          description,
          priority,
          showCreator: true,
        },
      }

      setMessages(prev => [...prev, aiMessage])
    } else {
      // Other tools (tasks, meetings) - to be implemented
      const aiMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: message || `I would use the ${toolCall.name} tool here, but it's not implemented yet.`,
        timestamp: new Date(),
        toolCall: {
          name: toolCall.name,
          status: 'pending',
        },
      }
      setMessages(prev => [...prev, aiMessage])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }



  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed right-0 top-0 h-screen w-full md:w-[500px] lg:w-[600px] z-50 transition-transform duration-300 ease-out overflow-hidden",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Aurora Background */}
        <div className="aurora-container absolute inset-0">
          <div className="aurora aurora-1" />
          <div className="aurora aurora-2" />
          <div className="aurora aurora-3" />
          <div className="aurora aurora-4" />
        </div>

        {/* Content */}
        <div className="relative h-full flex flex-col glass-strong border-l border-white/20 dark:border-white/10 max-h-screen overflow-hidden">
          {/* Header */}
          <div className="flex-none px-6 py-4 border-b border-white/20 dark:border-white/10 glass-strong">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-purple-500/50">
                    <Sparkles className="h-5 w-5 text-white animate-pulse" />
                  </div>
                  <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse shadow-lg shadow-green-500/50" />
                </div>
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent tracking-tight">
                    AI Actions
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0.5 font-bold bg-gradient-to-r from-purple-500 to-blue-500 text-white border-0">BETA</Badge>
                  </h2>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 glass-light hover:glass-strong hover:bg-red-500/20 hover:scale-110 transition-all cursor-pointer"
              >
                <X className="h-4 w-4 text-slate-600 dark:text-slate-300 group-hover:text-red-500 transition-colors" />
              </Button>
            </div>

          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500",
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  {/* Avatar */}
                  <div className={cn(
                    "flex-none h-8 w-8 rounded-full flex items-center justify-center",
                    message.role === 'user' 
                      ? "bg-gradient-to-br from-slate-600 to-slate-800" 
                      : "bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500"
                  )}>
                    {message.role === 'user' ? (
                      <User className="h-4 w-4 text-white" />
                    ) : (
                      <Bot className="h-4 w-4 text-white" />
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div className={cn(
                    "flex-1 max-w-[80%]",
                    message.role === 'user' ? 'flex flex-col items-end' : 'flex flex-col items-start'
                  )}>
                    <div className={cn(
                      "px-4 py-3 rounded-2xl shadow-lg",
                      message.role === 'user'
                        ? "glass-strong bg-gradient-to-br from-blue-500/25 to-purple-500/25 border border-blue-500/40 shadow-blue-500/20"
                        : "glass-medium border border-white/20 dark:border-white/10"
                    )}>
                      <p className={cn(
                        "text-sm whitespace-pre-wrap leading-relaxed",
                        message.role === 'user' 
                          ? "font-semibold bg-gradient-to-br from-blue-700 via-blue-600 to-purple-600 dark:from-blue-300 dark:via-blue-200 dark:to-purple-300 bg-clip-text text-transparent" 
                          : "text-white font-medium"
                      )}>
                        {message.content}
                      </p>
                      
                      {message.toolCall && (
                        <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-2">
                          <Zap className="h-3.5 w-3.5 text-yellow-500 animate-pulse" />
                          <span className="text-xs font-semibold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                            {message.toolCall.name}
                          </span>
                          {message.toolCall.status === 'pending' && (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Draft Email Component (Reply) */}
                    {message.draftEmail && message.role === 'assistant' && (
                      <div className="mt-3 w-full max-w-full">
                        <EmailDraftComponent
                          emailId={message.draftEmail.emailId}
                          provider={message.draftEmail.provider}
                          subject={message.draftEmail.subject}
                          draftContent={message.draftEmail.content}
                          onClose={() => {
                            setMessages(prev => prev.map(m => 
                              m.id === message.id ? { ...m, draftEmail: undefined } : m
                            ))
                          }}
                          onSent={() => {
                            setMessages(prev => prev.map(m => 
                              m.id === message.id ? { ...m, draftEmail: undefined } : m
                            ))
                          }}
                        />
                      </div>
                    )}

                    {/* New Email Component */}
                    {message.newEmail && message.role === 'assistant' && (
                      <div className="mt-3 w-full max-w-full">
                        <EmailDraftComponent
                          to={message.newEmail.to}
                          provider={message.newEmail.provider}
                          subject={message.newEmail.subject}
                          draftContent={message.newEmail.content}
                          isNewEmail={true}
                          onClose={() => {
                            setMessages(prev => prev.map(m => 
                              m.id === message.id ? { ...m, newEmail: undefined } : m
                            ))
                          }}
                          onSent={() => {
                            setMessages(prev => prev.map(m => 
                              m.id === message.id ? { ...m, newEmail: undefined } : m
                            ))
                          }}
                        />
                      </div>
                    )}

                    {message.jiraTicket && message.role === 'assistant' && (
                      <div className="mt-3 w-full max-w-full">
                        {message.jiraTicket.showCreator ? (
                          <JiraTicketCreator
                            initialTitle={message.jiraTicket.title}
                            initialDescription={message.jiraTicket.description}
                            initialPriority={message.jiraTicket.priority}
                            onSuccess={({ key, url }) => {
                              setMessages(prev => prev.map(m => 
                                m.id === message.id 
                                  ? { ...m, jiraTicket: { ...m.jiraTicket!, key, url, showCreator: false } } 
                                  : m
                              ))
                            }}
                            onClose={() => {
                              setMessages(prev => prev.map(m => 
                                m.id === message.id ? { ...m, jiraTicket: undefined } : m
                              ))
                            }}
                          />
                        ) : (
                          <div className="glass-strong border border-green-500/30 rounded-xl p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-green-500/20">
                                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                                </div>
                              <div>
                                <h4 className="font-semibold text-slate-800 dark:text-white text-sm">Jira Ticket Created</h4>
                                {message.jiraTicket.key && (
                                  <Badge variant="secondary" className="mt-1 bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">
                                    {message.jiraTicket.key}
                                  </Badge>
                                )}
                              </div>
                              </div>
                              {message.jiraTicket.url && (
                                <a
                                  href={message.jiraTicket.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                  <span>Open in Jira</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                            
                            <div className="space-y-2">
                              <div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Title</div>
                                <div className="text-sm font-medium text-slate-800 dark:text-white">{message.jiraTicket.title}</div>
                              </div>
                              
                              <div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Description</div>
                                <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{message.jiraTicket.description}</div>
                              </div>
                              
                              <div className="flex items-center gap-4 pt-2 border-t border-slate-200 dark:border-white/10">
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                  Priority: <span className={cn(
                                    "font-semibold",
                                    message.jiraTicket.priority === 'High' && "text-red-500 dark:text-red-400",
                                    message.jiraTicket.priority === 'Medium' && "text-yellow-600 dark:text-yellow-400",
                                    message.jiraTicket.priority === 'Low' && "text-green-600 dark:text-green-400"
                                  )}>{message.jiraTicket.priority}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <span className="text-[10px] font-medium text-muted-foreground/80 mt-1 px-1">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex-none h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="glass-medium border border-white/20 dark:border-white/10 px-4 py-3 rounded-2xl">
                    <div className="flex gap-1">
                      <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input */}
          <div className="flex-none px-6 py-4 border-t border-white/20 dark:border-white/10 glass-strong">
            <div className="relative group">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask AI to help with emails, tasks, or calendar..."
                className="min-h-[80px] pr-12 glass-medium resize-none focus:glass-strong transition-all font-medium text-sm placeholder:text-muted-foreground/60 placeholder:font-normal"
                rows={3}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim()}
                size="sm"
                className="absolute bottom-3 right-3 h-9 w-9 p-0 rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 hover:from-purple-600 hover:via-blue-600 hover:to-cyan-600 transition-all hover:scale-110 disabled:opacity-50 disabled:scale-100 shadow-lg shadow-purple-500/50 hover:shadow-xl hover:shadow-blue-500/50"
              >
                <Send className="h-4 w-4 text-white" />
              </Button>
            </div>
            <p className="text-[10px] font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mt-2 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-purple-500 animate-pulse" />
              Press Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>

      {/* Email Selector Modal */}
      <EmailSelectorModal
        isOpen={showEmailSelector}
        onClose={() => setShowEmailSelector(false)}
        onSelectEmail={(email) => {
          setShowEmailSelector(false)
          
          // Auto-trigger reply generation after email is selected
          // Don't set selectedEmail in state, just use the email directly
          setTimeout(async () => {
            setIsTyping(true)
            
            try {
              console.log('Fetching email content for:', email.id, email.provider)
              
              // Fetch full email content
              const emailResponse = await fetch(
                `/api/mail/email?id=${email.id}&provider=${email.provider}`,
                { cache: 'no-store' }
              )
              
              if (!emailResponse.ok) {
                const errorText = await emailResponse.text()
                console.error('Failed to fetch email:', errorText)
                throw new Error(`Failed to fetch email: ${errorText}`)
              }

              const emailData = await emailResponse.json()
              console.log('Email data fetched successfully:', emailData)
              
              // Generate reply using Gemini
              const replyResponse = await fetch('/api/ai/generate-reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  emailSubject: email.subject,
                  emailBody: emailData.bodyText || emailData.bodyHtml || email.bodyPreview,
                  from: email.from,
                  tone: 'professional',
                  additionalInstructions: '',
                }),
              })

              if (!replyResponse.ok) {
                const errorText = await replyResponse.text()
                console.error('Failed to generate reply:', errorText)
                throw new Error(`Failed to generate reply: ${errorText}`)
              }

              const { reply } = await replyResponse.json()
              console.log('Reply generated successfully')

              // Show draft in chat
              const aiMessage: Message = {
                id: Date.now().toString(),
                role: 'assistant',
                content: `I've drafted a professional reply to "${email.subject}":`,
                timestamp: new Date(),
                draftEmail: {
                  content: reply,
                  emailId: email.id,
                  provider: email.provider,
                  subject: email.subject,
                },
              }
              
              setMessages(prev => [...prev, aiMessage])
            } catch (error) {
              console.error('Error generating reply:', error)
              const errorMessage: Message = {
                id: Date.now().toString(),
                role: 'assistant',
                content: `Sorry, I couldn't generate a reply. ${error instanceof Error ? error.message : 'Please try again.'}`,
                timestamp: new Date(),
              }
              setMessages(prev => [...prev, errorMessage])
            } finally {
              setIsTyping(false)
            }
          }, 300)
        }}
      />

      {/* AI Consent Dialog */}
      <AIConsentDialog 
        isOpen={consentDialogOpen} 
        onConsent={() => {
          setConsentDialogOpen(false)
          if (pendingMessage) {
            setInput(pendingMessage)
            setPendingMessage(null)
            // Auto-send after consent
            setTimeout(() => handleSend(), 100)
          }
        }}
        onDecline={() => {
          setConsentDialogOpen(false)
          setPendingMessage(null)
        }}
      />
    </>
  )
}

