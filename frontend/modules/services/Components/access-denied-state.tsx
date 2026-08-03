"use client"

import { Lock } from "lucide-react"
import { Button } from "@/src/components/ui/button"
import { useRouter } from "next/navigation"

interface AccessDeniedStateProps {
  title?: string
  description?: string
  showLoginButton?: boolean
  showSignupButton?: boolean
}

export function AccessDeniedState({
  title = "Create Project to Get Started",
  description = "Sign in or create an account to post projects and start collaborating",
  showLoginButton = true,
  showSignupButton = true,
}: AccessDeniedStateProps) {
  const router = useRouter()

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="bg-muted/50 rounded-full p-4 mb-4">
        <Lock className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-muted-foreground text-center max-w-md mb-6">{description}</p>
      <div className="flex gap-3">
        {showLoginButton && (
          <Button variant="outline" onClick={() => router.push("/account/user/login")}>
            Sign In
          </Button>
        )}
        {showSignupButton && <Button onClick={() => router.push("/account/user/registration")}>Sign Up</Button>}
      </div>
    </div>
  )
}
