"use client"

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import Link from 'next/link'
import { useToast } from "@/hooks/use-toast"

interface AIConsentDialogProps {
  isOpen: boolean
  onConsent: () => void
  onDecline: () => void
}

export function AIConsentDialog({ isOpen, onConsent, onDecline }: AIConsentDialogProps) {
  const [understood, setUnderstood] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleConsent = async () => {
    if (!understood) return
    
    setLoading(true)
    try {
      const res = await fetch('/api/user/ai-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent: true }),
      })

      if (!res.ok) {
        throw new Error('Failed to grant consent')
      }

      toast({
        title: "AI Features Enabled",
        description: "Retrying your request...",
      })
      
      setUnderstood(false)
      onConsent()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to enable AI features. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDecline = () => {
    setUnderstood(false)
    onDecline()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDecline()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-slate-900">AI Features Consent</DialogTitle>
          <DialogDescription className="text-lg text-slate-600 mt-2">
            To use AI features, we need your consent to process your data with AWS Bedrock.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-6">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
            <h3 className="font-bold text-lg text-slate-900 mb-3">What AI Features Do</h3>
            <ul className="text-base text-slate-700 space-y-2 ml-5">
              <li>• Extract tasks from your emails automatically</li>
              <li>• Generate professional email replies</li>
              <li>• AI chat assistant for productivity help</li>
              <li>• Create Jira tickets from conversations</li>
            </ul>
          </div>

          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
            <h3 className="font-bold text-lg text-red-900 mb-3">Important: Third-Party Processing</h3>
            <p className="text-base text-slate-700 leading-relaxed">
              Your email content, calendar events, and task descriptions will be sent to <strong>AWS Bedrock (OpenAI GPT)</strong> for processing when you use AI features.
            </p>
          </div>
          
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
            <h3 className="font-bold text-lg text-green-900 mb-3">Data Protection Guarantee</h3>
            <p className="text-base text-slate-700 leading-relaxed">
              <strong className="text-green-900">Your data is NOT used to train AI models.</strong> AWS Bedrock does not store, log, or use your data for training. It's processed only for your request and immediately deleted.
            </p>
          </div>

          <div className="text-sm text-slate-600 text-center">
            <Link href="/privacy" target="_blank" className="text-blue-600 hover:underline font-semibold">
              Privacy Policy
            </Link>
            {' '} | {' '}
            <Link href="/terms" target="_blank" className="text-blue-600 hover:underline font-semibold">
              Terms of Service
            </Link>
          </div>

          {/* Consent Checkbox */}
          <div className="border-4 border-slate-900 bg-slate-100 rounded-xl p-6">
            <div className="flex items-start space-x-4">
              <Checkbox
                id="ai-consent"
                checked={understood}
                onCheckedChange={(checked) => setUnderstood(checked as boolean)}
                className="mt-1.5 h-6 w-6 border-2 border-slate-900 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <label
                htmlFor="ai-consent"
                className="text-base font-semibold leading-relaxed cursor-pointer text-slate-900 flex-1"
              >
                I consent to having my data processed by AWS Bedrock (OpenAI GPT). I understand my data will NOT be used for AI training and I can revoke this consent anytime in Settings.
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={handleDecline}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConsent}
            disabled={!understood || loading}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Enabling..." : !understood ? "Check the box above to enable" : "Enable AI Features"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

