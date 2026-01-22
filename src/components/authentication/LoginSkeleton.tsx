'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"

export default function LoginSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-[460px] min-w-[335px] rounded-2xl shadow-xl px-6 py-2">
        
        {/* Header */}
        <CardHeader className="text-center">
          <CardTitle className="text-2xl md:text-3xl text-gray-600">
            Welcome to Ejento AI
          </CardTitle>
          <CardDescription className="font-semibold">
            Sign in or Create account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 mt-4">

          {/* SSO Buttons */}
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />

          {/* OR Divider */}
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <Skeleton className="h-4 w-8 rounded-md" />
            <Separator className="flex-1" />
          </div>

          {/* Login Form Inputs */}
          <Skeleton className="h-12 w-full rounded-xl" />
          {/* Submit Button */}
          <Skeleton className="h-12 w-full rounded-xl" />

          <Separator />

          {/* Disclaimer */}
          <Skeleton className="h-3 w-full rounded-md" />
          <Skeleton className="h-3 w-4/5 mx-auto rounded-md" />

        </CardContent>
      </Card>
    </div>
  )
}
