'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, X, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface JiraProject {
  id: string
  key: string
  name: string
}

interface JiraTicketCreatorProps {
  initialTitle?: string
  initialDescription?: string
  initialPriority?: string
  initialStoryPoints?: number
  onSuccess?: (ticket: { key: string; url: string }) => void
  onClose?: () => void
}

export default function JiraTicketCreator({
  initialTitle = '',
  initialDescription = '',
  initialPriority = 'Medium',
  initialStoryPoints = 0,
  onSuccess,
  onClose,
}: JiraTicketCreatorProps) {
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription)
  const [priority, setPriority] = useState(initialPriority)
  const [storyPoints, setStoryPoints] = useState<number>(initialStoryPoints)
  const [projects, setProjects] = useState<JiraProject[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [isLoadingProjects, setIsLoadingProjects] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch Jira projects on mount
  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    setIsLoadingProjects(true)
    try {
      const response = await fetch('/api/jira/projects')
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects || [])
        if (data.projects && data.projects.length > 0) {
          setSelectedProject(data.projects[0].key)
        }
      }
    } catch (err) {
      console.error('Failed to fetch Jira projects:', err)
    } finally {
      setIsLoadingProjects(false)
    }
  }

  const handleCreate = async () => {
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required')
      return
    }

    if (!selectedProject) {
      setError('Please select a project')
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/create-jira-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectKey: selectedProject,
          title: title.trim(),
          description: description.trim(),
          priority,
          storyPoints: storyPoints > 0 ? storyPoints : undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create Jira ticket')
      }

      const data = await response.json()
      const { key, url, warning } = data
      
      if (warning) {
        console.warn('Jira ticket created with warning:', warning)
      }
      
      if (onSuccess) {
        onSuccess({ key, url })
      }
    } catch (err: any) {
      console.error('Error creating Jira ticket:', err)
      setError(err.message || 'Failed to create ticket. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="rounded-2xl glass-strong border-2 border-blue-500/30 overflow-hidden shadow-2xl shadow-blue-500/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="px-5 py-3 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-cyan-500/10 border-b border-white/20 dark:border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-500 animate-pulse" />
            <h3 className="text-sm font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Create Jira Ticket
            </h3>
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
              AI ASSISTED
            </Badge>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-7 w-7 p-0 hover:bg-white/10"
            >
              <X className="h-3.5 w-3.5 text-slate-400" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
        <div>
          <Label className="text-slate-800 dark:text-slate-200 text-xs font-semibold mb-2 block">Project *</Label>
          <Select value={selectedProject} onValueChange={setSelectedProject} disabled={isLoadingProjects}>
            <SelectTrigger className="bg-white/80 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 h-9 text-sm">
              <SelectValue placeholder={isLoadingProjects ? "Loading projects..." : "Select a project"} />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700">
              {projects.map((project) => (
                <SelectItem key={project.key} value={project.key} className="text-slate-800 dark:text-slate-200">
                  <span className="text-sm">{project.name} ({project.key})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-slate-800 dark:text-slate-200 text-xs font-semibold mb-2 block">Title *</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Brief summary of the issue"
            className="bg-white/80 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:border-blue-500 h-9 text-sm"
          />
        </div>

        <div>
          <Label className="text-slate-800 dark:text-slate-200 text-xs font-semibold mb-2 block">Description *</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed description of the issue"
            rows={6}
            className="bg-white/80 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:border-blue-500 resize-none text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-slate-800 dark:text-slate-200 text-xs font-semibold mb-2 block">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="bg-white/80 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                <SelectItem value="High" className="text-slate-800 dark:text-slate-200">
                  <span className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    High
                  </span>
                </SelectItem>
                <SelectItem value="Medium" className="text-slate-800 dark:text-slate-200">
                  <span className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                    Medium
                  </span>
                </SelectItem>
                <SelectItem value="Low" className="text-slate-800 dark:text-slate-200">
                  <span className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Low
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-slate-800 dark:text-slate-200 text-xs font-semibold mb-2 block">Story Points</Label>
            <Select value={storyPoints.toString()} onValueChange={(v) => setStoryPoints(parseInt(v))}>
              <SelectTrigger className="bg-white/80 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                <SelectItem value="0" className="text-slate-800 dark:text-slate-200"><span className="text-sm">None</span></SelectItem>
                <SelectItem value="1" className="text-slate-800 dark:text-slate-200"><span className="text-sm">1</span></SelectItem>
                <SelectItem value="2" className="text-slate-800 dark:text-slate-200"><span className="text-sm">2</span></SelectItem>
                <SelectItem value="3" className="text-slate-800 dark:text-slate-200"><span className="text-sm">3</span></SelectItem>
                <SelectItem value="5" className="text-slate-800 dark:text-slate-200"><span className="text-sm">5</span></SelectItem>
                <SelectItem value="8" className="text-slate-800 dark:text-slate-200"><span className="text-sm">8</span></SelectItem>
                <SelectItem value="13" className="text-slate-800 dark:text-slate-200"><span className="text-sm">13</span></SelectItem>
                <SelectItem value="21" className="text-slate-800 dark:text-slate-200"><span className="text-sm">21</span></SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-white/5 border-t border-white/20 dark:border-white/10 flex items-center gap-2">
        <Button
          onClick={handleCreate}
          disabled={isCreating || !title.trim() || !description.trim()}
          className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 h-9 text-sm"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
              Create Ticket
            </>
          )}
        </Button>
        {onClose && (
          <Button
            onClick={onClose}
            variant="outline"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 h-9 px-4 text-sm"
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  )
}

