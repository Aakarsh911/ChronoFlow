import { AuthForm } from "@/components/auth-form"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">AI Time Manager</h1>
          <p className="text-muted-foreground">Intelligent productivity for modern teams</p>
        </div>
  <AuthForm />
      </div>
    </div>
  )
}
