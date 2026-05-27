import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Lock, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const schema = z.object({
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof schema>;

export default function ArchonLoginPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const form = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { password: "" },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const res = await fetch("/api/archon/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: data.password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Invalid password");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["/api/archon/me"] });
      navigate("/archon/dashboard");
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Invalid password");
    },
  });

  return (
    <div className="min-h-screen w-full bg-[#0a0a0f] flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-white">
          <ShieldAlert className="w-10 h-10 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Archon Access</h1>
          <p className="text-sm text-white/50">Super-admin panel — authorised personnel only</p>
        </div>

        <div className="rounded-xl p-6 bg-black/40 backdrop-blur-xl border border-primary/20 shadow-2xl shadow-primary/5 text-white [&_label]:text-white/80">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => {
                setErrorMsg(null);
                loginMutation.mutate(data);
              })}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter archon password"
                          className="pl-9 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/35 focus-visible:ring-primary/50"
                          data-testid="input-archon-password"
                          autoComplete="current-password"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                          tabIndex={-1}
                          data-testid="button-toggle-archon-password"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {errorMsg && (
                <p className="text-sm text-red-400" data-testid="text-archon-login-error">
                  {errorMsg}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
                data-testid="button-archon-sign-in"
              >
                {loginMutation.isPending ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
