import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Pencil } from "lucide-react";
import { toast } from "sonner";

const Auth = () => {
  const [authKey, setAuthKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!authKey.trim()) {
      toast.error("인증키를 입력해주세요");
      return;
    }

    setIsLoading(true);

    // 데모용 임시 인증 코드 (추후 n8n 워크플로우로 대체)
    const validCodes = ['storytest', 'maum2025', '404notfound'];

    // 약간의 로딩 효과
    await new Promise(resolve => setTimeout(resolve, 500));

    if (validCodes.includes(authKey.toLowerCase())) {
      toast.success("인증 성공!");
      navigate("/create_input");
    } else {
      toast.error("유효하지 않은 인증 코드입니다");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-lg space-y-2 animate-fade-in px-6">
        <div className="flex flex-col items-center gap-4">
          <Pencil className="h-16 w-16 text-primary" />
          <h2 className="text-4xl font-bold text-center text-foreground mb-8">확인코드를 입력해주세요</h2>
        </div>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="인증키를 입력하세요"
            value={authKey}
            onChange={(e) => setAuthKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="flex-1 rounded-full border-2 border-border bg-card px-6 py-6 text-lg focus:border-primary focus:ring-primary"
          />
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            size="lg"
            className="bg-primary hover:bg-primary/80 text-primary-foreground rounded-full px-6 py-6 transition-all duration-300 hover:scale-105"
          >
            {isLoading ? <span className="animate-spin">⏳</span> : <ArrowRight className="h-6 w-6" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
