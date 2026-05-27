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
          "fixed right-0 top-0 z-50 h-screen w-full overflow-hidden transition-transform duration-300 ease-out md:w-[440px] lg:w-[520px]",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="cf-ai-drawer relative flex h-full max-h-screen flex-col overflow-hidden">
          <div className="cf-ai-drawer-scene" aria-hidden>
            <div className="cf-aurora-field absolute inset-0">
              <div className="cf-aurora cf-aurora-a" />
              <div className="cf-aurora cf-aurora-b" />
              <div className="cf-aurora cf-aurora-c" />
            </div>
            <div className="absolute inset-0 cf-glow opacity-90" />
            <div className="absolute inset-0 cf-grid opacity-50" />
          </div>

          <div className="cf-ai-drawer-content">
          {/* Header */}
          <div className="cf-ai-drawer-header">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="cf-ai-avatar cf-ai-avatar-assistant h-9 w-9">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--cf-text)]">
                    AI Assistant
                    <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-medium uppercase tracking-wide">
                      Beta
                    </Badge>
                  </h2>
                  <p className="text-xs text-[var(--cf-text-muted)]">
                    Draft emails, create tickets, extract tasks
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 text-[var(--cf-text-muted)] hover:text-[var(--cf-text)]"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="cf-ai-drawer-messages" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  <div className={cn(
                    "cf-ai-avatar",
                    message.role === 'user' ? 'cf-ai-avatar-user' : 'cf-ai-avatar-assistant'
                  )}>
                    {message.role === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>

                  <div className={cn(
                    "flex min-w-0 flex-1 max-w-[85%] flex-col",
                    message.role === 'user' ? 'items-end' : 'items-start'
                  )}>
                    <div className={cn(
                      "cf-ai-bubble",
                      message.role === 'user' ? 'cf-ai-bubble-user' : 'cf-ai-bubble-assistant'
                    )}>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      
                      {message.toolCall && (
                        <div className="mt-2 flex items-center gap-2 border-t border-[var(--cf-border)] pt-2">
                          <Zap className="h-3.5 w-3.5 text-[rgba(var(--cf-accent-rgb),1)]" />
                          <span className="text-xs font-medium text-[var(--cf-text-muted)]">
                            {message.toolCall.name}
                          </span>
                          {message.toolCall.status === 'pending' && (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-[rgba(var(--cf-accent-rgb),1)]" />
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
                          <div className="cf-surface-card mt-1 rounded-lg border border-green-500/25 bg-green-500/5 p-4">
                            <div className="mb-3 flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <div className="rounded-lg bg-green-500/15 p-2">
                                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                                </div>
                              <div>
                                <h4 className="text-sm font-semibold text-[var(--cf-text)]">Jira Ticket Created</h4>
                                {message.jiraTicket.key && (
                                  <Badge variant="secondary" className="mt-1 bg-green-500/10 text-green-700 dark:text-green-400">
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
                                  className="flex items-center gap-1 text-xs text-[rgba(var(--cf-accent-rgb),1)] hover:underline"
                                >
                                  <span>Open in Jira</span>
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                            
                            <div className="space-y-2">
                              <div>
                                <div className="mb-1 text-xs text-[var(--cf-text-muted)]">Title</div>
                                <div className="text-sm font-medium text-[var(--cf-text)]">{message.jiraTicket.title}</div>
                              </div>
                              
                              <div>
                                <div className="mb-1 text-xs text-[var(--cf-text-muted)]">Description</div>
                                <div className="whitespace-pre-wrap text-sm text-[var(--cf-text-muted)]">{message.jiraTicket.description}</div>
                              </div>
                              
                              <div className="flex items-center gap-4 border-t border-[var(--cf-border)] pt-2">
                                <div className="text-xs text-[var(--cf-text-muted)]">
                                  Priority: <span className={cn(
                                    "font-semibold",
                                    message.jiraTicket.priority === 'High' && "text-red-500",
                                    message.jiraTicket.priority === 'Medium' && "text-amber-600",
                                    message.jiraTicket.priority === 'Low' && "text-green-600"
                                  )}>{message.jiraTicket.priority}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <span className="mt-1 px-1 text-[10px] text-[var(--cf-text-dim)]">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-3">
                  <div className="cf-ai-avatar cf-ai-avatar-assistant">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                  <div className="cf-ai-bubble cf-ai-bubble-assistant">
                    <p className="text-sm text-[var(--cf-text-muted)]">Thinking…</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input */}
          <div className="cf-ai-drawer-input">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask AI to help with emails, tasks, or calendar..."
                className="min-h-[72px] resize-none border-[var(--cf-border)] bg-[color-mix(in_srgb,var(--cf-bg)_55%,transparent)] pr-12 text-sm backdrop-blur-sm"
                rows={3}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim()}
                size="sm"
                className="cf-btn-primary absolute bottom-2.5 right-2.5 h-8 w-8 rounded-md p-0 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-[10px] text-[var(--cf-text-dim)]">
              <Sparkles className="h-3 w-3 text-[rgba(var(--cf-accent-rgb),1)]" />
              Enter to send · Shift+Enter for new line
            </p>
          </div>
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

