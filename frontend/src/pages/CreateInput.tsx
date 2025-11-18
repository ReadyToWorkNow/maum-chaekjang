import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AudioRecorder } from "@/utils/audioRecorder";

// n8n webhook URL (직접 전송)
const WEBHOOK_URL = "https://robotshin.app.n8n.cloud/webhook/voice_recording";

const CreateInput = () => {
  const [isRecording, setIsRecording] = useState(false);
  const navigate = useNavigate();
  const recorderRef = useRef<AudioRecorder | null>(null);

  const handleRecordToggle = async () => {
    if (!isRecording) {
      try {
        recorderRef.current = new AudioRecorder();
        await recorderRef.current.start();
        setIsRecording(true);
        toast.success("녹음을 시작합니다");
      } catch (error) {
        toast.error("마이크 접근 권한이 필요합니다");
        console.error(error);
      }
    } else {
      try {
        if (recorderRef.current) {
          const audioBlob = await recorderRef.current.stop();
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          
          // Download the recording
          recorderRef.current.downloadRecording(audioBlob, `recording-${timestamp}.webm`);
          
          setIsRecording(false);
          toast.success("녹음이 완료되었습니다");
          
          // Send to webhook and wait for response
          toast.info("웹훅으로 전송 중...");
          
          try {
            const webhookResponse = await recorderRef.current.sendToWebhook(audioBlob, WEBHOOK_URL);
            console.log("✅ 웹훅 응답 성공:", webhookResponse);
            
            toast.success("전송 완료! 동화책 생성 중...");
            
            // Navigate to loading page with the webhook response
            navigate("/create_loading", { 
              state: { storyData: webhookResponse },
              replace: true 
            });
            
          } catch (webhookError) {
            console.error("❌ 웹훅 전송 실패:", webhookError);
            toast.error("웹훅 전송에 실패했습니다. 다시 시도해주세요.");
          }
        }
      } catch (error) {
        setIsRecording(false);
        toast.error("녹음 처리에 실패했습니다");
        console.error(error);
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-12 animate-fade-in">
        <h1 className="text-5xl font-bold text-foreground">
          너의 이야기를 들려줄래?
        </h1>
        
        <Button
          onClick={handleRecordToggle}
          variant={isRecording ? "destructive" : "default"}
          className="rounded-full w-32 h-32 transition-all duration-300 hover:scale-110"
        >
          {isRecording ? (
            <Square size={72} className="fill-current" />
          ) : (
            <Mic size={72} />
          )}
        </Button>
      </div>
    </div>
  );
};

export default CreateInput;
