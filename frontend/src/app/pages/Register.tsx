import { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";

export function Register() {
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    displayName: "",
    password: "",
    dateOfBirth: "",
  });
  const { register, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(formData);
      toast.success("Account created successfully!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registration failed. Please try again.";
      toast.error(message);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#313338] px-4 py-8">
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

        {/* Register Card */}
        <div className="bg-[#2b2d31] rounded-lg p-8 shadow-2xl">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Create an account</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#b5bac1] text-xs font-bold uppercase">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                required
                className="bg-[#1e1f22] border-[#1e1f22] text-white placeholder:text-[#6d6f78] focus:border-[#5865f2] focus-visible:ring-0 h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username" className="text-[#b5bac1] text-xs font-bold uppercase">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => handleChange("username", e.target.value)}
                required
                className="bg-[#1e1f22] border-[#1e1f22] text-white placeholder:text-[#6d6f78] focus:border-[#5865f2] focus-visible:ring-0 h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-[#b5bac1] text-xs font-bold uppercase">
                Display Name
              </Label>
              <Input
                id="displayName"
                type="text"
                value={formData.displayName}
                onChange={(e) => handleChange("displayName", e.target.value)}
                required
                className="bg-[#1e1f22] border-[#1e1f22] text-white placeholder:text-[#6d6f78] focus:border-[#5865f2] focus-visible:ring-0 h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#b5bac1] text-xs font-bold uppercase">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                required
                className="bg-[#1e1f22] border-[#1e1f22] text-white placeholder:text-[#6d6f78] focus:border-[#5865f2] focus-visible:ring-0 h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateOfBirth" className="text-[#b5bac1] text-xs font-bold uppercase">
                Date of Birth
              </Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleChange("dateOfBirth", e.target.value)}
                required
                className="bg-[#1e1f22] border-[#1e1f22] text-white placeholder:text-[#6d6f78] focus:border-[#5865f2] focus-visible:ring-0 h-11"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-[#5865f2] hover:bg-[#4752c4] text-white font-medium rounded transition-colors"
            >
              {isLoading ? "Creating account..." : "Continue"}
            </Button>

            <div className="text-sm text-[#949ba4]">
              Already have an account?{" "}
              <Link to="/login" className="text-[#00a8fc] hover:underline">
                Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}