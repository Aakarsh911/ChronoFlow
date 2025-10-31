'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

interface Email {
  id: string
  subject: string
  from: {
    name: string
    address: string
  }
  bodyPreview: string
}

interface ExtractedTask {
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  dueDate?: string
  category?: string
}

interface TaskExtractionProps {
  emails: Email[]
  onTasksCreated?: () => void
}

export default function EmailTaskExtractor({ emails, onTasksCreated }: TaskExtractionProps) {
  const [extracting, setExtracting] = useState(false)
  const [results, setResults] = useState<any[] | null>(null)
  const [creating, setCreating] = useState(false)
  const { toast } = useToast()

  const handleExtractTasks = async (autoCreate = false) => {
    if (emails.length === 0) {
      toast({
        title: 'No emails',
        description: 'No emails available to extract tasks from',
        variant: 'destructive',
      })
      return
    }

    try {
      if (autoCreate) {
        setCreating(true)
      } else {
        setExtracting(true)
      }

      const response = await fetch('/api/tasks/extract-from-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emails,
          autoCreate,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to extract tasks')
      }

      const data = await response.json()

      if (autoCreate) {
        toast({
          title: '✅ Tasks created!',
          description: `Created ${data.created} tasks from ${data.extracted} emails`,
        })
        setResults(null)
        onTasksCreated?.()
      } else {
        setResults(data.results || [])
        
        if (data.results.length === 0) {
          toast({
            title: 'No actionable items found',
            description: 'AI didn\'t find any tasks in your emails',
          })
        } else {
          toast({
            title: '🤖 Tasks extracted!',
            description: `Found actionable items in ${data.extracted} emails`,
          })
        }
      }

    } catch (error) {
      console.error('Error extracting tasks:', error)
      toast({
        title: 'Error',
        description: 'Failed to extract tasks from emails',
        variant: 'destructive',
      })
    } finally {
      setExtracting(false)
      setCreating(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive'
      case 'medium':
        return 'default'
      case 'low':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={() => handleExtractTasks(false)}
          disabled={extracting || creating || emails.length === 0}
          variant="outline"
          size="sm"
        >
          {extracting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Extract Tasks with AI
            </>
          )}
        </Button>

        {results && results.length > 0 && (
          <Button
            onClick={() => handleExtractTasks(true)}
            disabled={creating}
            size="sm"
          >
            {creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Create {results.length} Tasks
              </>
            )}
          </Button>
        )}
      </div>

      {/* Results Display */}
      {results && results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              AI-Extracted Tasks
            </CardTitle>
            <CardDescription>
              Found {results.reduce((sum, r) => sum + r.tasks.length, 0)} actionable items in {results.length} emails
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {results.map((result, idx) => (
                  <div key={idx} className="border rounded-lg p-4 space-y-3">
                    {/* Email Info */}
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">
                            {result.emailSubject}
                          </h4>
                          <p className="text-xs text-muted-foreground truncate">
                            From: {result.from}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {Math.round(result.confidence * 100)}% confident
                        </Badge>
                      </div>
                    </div>

                    <Separator />

                    {/* Extracted Tasks */}
                    <div className="space-y-3">
                      {result.tasks.map((task: ExtractedTask, taskIdx: number) => (
                        <div
                          key={taskIdx}
                          className="bg-muted/50 rounded-md p-3 space-y-2"
                        >
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{task.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {task.description}
                              </p>
                            </div>
                          </div>

                          {/* Task Metadata */}
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                              {task.priority} priority
                            </Badge>
                            {task.category && (
                              <Badge variant="outline" className="text-xs">
                                {task.category}
                              </Badge>
                            )}
                            {task.dueDate && (
                              <Badge variant="outline" className="text-xs">
                                Due: {new Date(task.dueDate).toLocaleDateString()}
                              </Badge>
                            )}
                            {/* Source badge: gmail or outlook or mail */}
                            <Badge variant="outline" className="text-xs">
                              {(() => {
                                // Use provider if available, else infer from address
                                if (result.provider === 'gmail') return 'gmail';
                                if (result.provider === 'outlook') return 'outlook';
                                const from = (typeof result.from === 'string' ? result.from : result.from?.address) || '';
                                if (from.toLowerCase().includes('gmail.com')) return 'gmail';
                                if (from.toLowerCase().includes('outlook.com') || from.toLowerCase().includes('microsoft.com')) return 'outlook';
                                return 'mail';
                              })()}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Empty State for No Results */}
      {results && results.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-2">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="font-medium">No actionable items found</h3>
              <p className="text-sm text-muted-foreground">
                The AI didn't find any clear tasks in your emails.
                <br />
                This is normal for newsletters, notifications, and casual conversations.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
