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

    // 재시도 로직: 최대 3번, 10초 타임아웃
    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃

        // n8n 웹훅으로 인증 코드 검증
        const response = await fetch('https://robotshin.app.n8n.cloud/webhook/check_real_code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ authKey }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`서버 응답 오류: ${response.status}`);
        }

        const isValid = await response.json();

        if (isValid) {
          toast.success("인증 성공!");
          navigate("/create_input");
          return;
        } else {
          toast.error("유효하지 않은 인증 코드입니다");
          setIsLoading(false);
          return;
        }
      } catch (error) {
        lastError = error;
        console.error(`Auth attempt ${attempt}/${maxRetries} failed:`, error);

        if (attempt < maxRetries) {
          // 재시도 전 대기 (1초)
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    // 모든 재시도 실패
    setIsLoading(false);
    if (lastError instanceof Error && lastError.name === 'AbortError') {
      toast.error("인증 서버 응답 시간이 초과되었습니다. 다시 시도해주세요.");
    } else {
      toast.error("인증 검증 중 오류가 발생했습니다. 네트워크 연결을 확인하고 다시 시도해주세요.");
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
