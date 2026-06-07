import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Heart, Shield, AlertCircle } from "lucide-react";
import { APP_NAME, APP_TAGLINE } from "@/lib/branding";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  const validate = () => {
    const e: typeof errors = {};
    if (!email) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email address";
    if (!isResetMode && !password) e.password = "Password is required";
    else if (!isResetMode && password.length < 6) e.password = "Must be at least 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      navigate("/");
    }
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email", description: "Password reset link has been sent." });
      setIsResetMode(false);
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-sidebar-primary flex items-center justify-center">
            <Heart className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">{APP_NAME}</h2>
            <p className="text-xs opacity-60">{APP_TAGLINE}</p>
          </div>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-extrabold leading-tight">
            Workforce<br />Operating<br />System
          </h1>
          <p className="text-base opacity-70 max-w-sm">
            Streamline HR operations, manage staff efficiently, and ensure compliance - all in one unified platform.
          </p>
          <div className="flex gap-3 flex-wrap">
            {["Roster Management", "Leave Tracking", "Duty Engine", "Staff Wellness"].map((f) => (
              <div key={f} className="px-3 py-1.5 rounded-full text-xs font-medium bg-sidebar-accent text-sidebar-accent-foreground">
                {f}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs opacity-50">
          <Shield className="h-3.5 w-3.5" />
          <span>HIPAA-aware • Role-based access • Encrypted</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-md border-0 shadow-xl">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 lg:hidden flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
                <Heart className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">{APP_NAME}</span>
            </div>
            <CardTitle className="text-2xl font-bold">
              {isResetMode ? "Reset Password" : "Welcome back"}
            </CardTitle>
            <CardDescription>
              {isResetMode
                ? "Enter your email to receive a reset link"
                : "Sign in to the HR Management System"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={isResetMode ? handleResetPassword : handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@mindfulhr.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors((p) => ({ ...p, email: undefined }));
                  }}
                  className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.email}
                  </p>
                )}
              </div>
              {!isResetMode && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrors((p) => ({ ...p, password: undefined }));
                    }}
                    className={errors.password ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.password && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.password}
                    </p>
                  )}
                </div>
              )}
              <Button type="submit" className="w-full font-semibold" disabled={loading}>
                {loading ? "Please wait..." : isResetMode ? "Send Reset Link" : "Sign In"}
              </Button>
              <button
                type="button"
                className="w-full text-sm text-muted-foreground hover:text-primary transition-colors"
                onClick={() => {
                  setIsResetMode(!isResetMode);
                  setErrors({});
                }}
              >
                {isResetMode ? "← Back to login" : "Forgot your password?"}
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
