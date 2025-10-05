"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function CalendarLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-20" />
          <div className="flex gap-1">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
      </div>

      {/* Calendar grid skeleton */}
      <Card>
        <CardContent className="p-0">
          {/* Header row */}
          <div className="grid grid-cols-6 border-b">
            <div className="p-4 border-r bg-muted/30">
              <Skeleton className="h-4 w-8" />
            </div>
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="p-4 text-center border-r last:border-r-0">
                <Skeleton className="h-3 w-8 mx-auto mb-2" />
                <Skeleton className="h-6 w-6 mx-auto" />
              </div>
            ))}
          </div>

          {/* Time slots skeleton */}
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="grid grid-cols-6 border-b" style={{ height: '60px' }}>
              <div className="border-r bg-muted/30 flex items-center justify-center">
                <Skeleton className="h-3 w-10" />
              </div>
              {Array.from({ length: 5 }, (_, j) => (
                <div key={j} className="border-r last:border-r-0 p-2">
                  {Math.random() > 0.7 && (
                    <Skeleton className="h-8 w-full rounded" />
                  )}
                </div>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Today's events skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                <Skeleton className="w-1 h-12 rounded-full" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
