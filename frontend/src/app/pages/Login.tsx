import { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";

export function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(identifier, password);
      toast.success("Welcome back!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid credentials. Please try again.";
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#313338] px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#5865f2] flex items-center justify-center">
              <MessageSquare className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-white">Discord</h1>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-[#2b2d31] rounded-lg p-8 shadow-2xl">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Welcome back!</h2>
            <p className="text-[#b5bac1] text-sm">We're so excited to see you again!</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#b5bac1] text-xs font-bold uppercase">
                Email or Username
              </Label>
              <Input
                id="email"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                className="bg-[#1e1f22] border-[#1e1f22] text-white placeholder:text-[#6d6f78] focus:border-[#5865f2] focus-visible:ring-0 h-11"
                placeholder="Enter your email or username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#b5bac1] text-xs font-bold uppercase">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-[#1e1f22] border-[#1e1f22] text-white placeholder:text-[#6d6f78] focus:border-[#5865f2] focus-visible:ring-0 h-11"
                placeholder="Enter your password"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-[#5865f2] hover:bg-[#4752c4] text-white font-medium rounded transition-colors"
            >
              {isLoading ? "Logging in..." : "Log In"}
            </Button>

            <div className="text-sm text-[#949ba4]">
              Need an account?{" "}
              <Link to="/register" className="text-[#00a8fc] hover:underline">
                Register
              </Link>
            </div>
          </form>
        </div>

        {/* Demo hint */}
        <div className="mt-6 text-center text-xs text-[#6d6f78]">
          <p>Use your registered email/username and password to log in.</p>
        </div>
      </div>
    </div>
  );
}