import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { StoryPage } from "@/types/storybook";

const loadingMessages = [
  "이야기를 분석하는중...",
  "동화책 구성중...",
  "그림 그리는중...",
  "음성 생성중...",
  "모든 것들을 하나로 묶는중...",
];

const CreateLoading = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const storyData = location.state?.storyData;

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2000);

    return () => clearInterval(messageInterval);
  }, []);

  useEffect(() => {
    const processStory = async () => {
      if (!storyData) {
        toast.error("스토리 데이터가 없습니다");
        navigate("/create_input");
        return;
      }

      console.log("📥 받은 웹훅 데이터:", storyData);
      
      // 웹훅이 배열로 응답하는 경우 첫 번째 요소 추출
      const data = Array.isArray(storyData) ? storyData[0] : storyData;
      const storyLines = data?.lines || [];
      
      console.log("📝 추출된 Lines:", storyLines);

      try {
        setProgress(10);
        setCurrentIndex(0);

        // Step 1: Process story into pages
        const { data: pagesData, error: processError } = await supabase.functions.invoke(
          'process-story',
          { body: { storyLines } }
        );

        if (processError) throw processError;
        if (!pagesData?.pages) throw new Error("페이지 생성 실패");

        setProgress(30);
        setCurrentIndex(1);

        // Step 2: Generate images for each page
        const pages: StoryPage[] = pagesData.pages;
        const totalPages = pages.length;
        const pagesWithImages: StoryPage[] = [];

        setCurrentIndex(2);

        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          
          try {
            const { data: imageData, error: imageError } = await supabase.functions.invoke(
              'generate-story-images',
              { body: { imagePrompt: page.image_prompt } }
            );

            if (imageError) throw imageError;

            pagesWithImages.push({
              ...page,
              imageUrl: imageData.imageUrl
            });

            const imageProgress = 30 + ((i + 1) / totalPages) * 40;
            setProgress(imageProgress);
          } catch (error) {
            console.error(`Error generating image for page ${i + 1}:`, error);
            pagesWithImages.push(page);
          }
        }

        setProgress(70);
        setCurrentIndex(3);

        // Step 3: Generate TTS for each page
        const pagesWithAudio: StoryPage[] = [];

        for (let i = 0; i < pagesWithImages.length; i++) {
          const page = pagesWithImages[i];
          
          try {
            const { data: ttsData, error: ttsError } = await supabase.functions.invoke(
              'generate-tts',
              { body: { text: page.text } }
            );

            if (ttsError) throw ttsError;

            if (ttsData?.audioContent) {
              // Base64를 Blob으로 변환
              const binaryString = atob(ttsData.audioContent);
              const bytes = new Uint8Array(binaryString.length);
              for (let j = 0; j < binaryString.length; j++) {
                bytes[j] = binaryString.charCodeAt(j);
              }
              const audioBlob = new Blob([bytes], { type: 'audio/wav' });
              const audioUrl = URL.createObjectURL(audioBlob);

              pagesWithAudio.push({
                ...page,
                audioUrl
              });
            } else {
              pagesWithAudio.push(page);
            }

            const ttsProgress = 70 + ((i + 1) / totalPages) * 25;
            setProgress(ttsProgress);
          } catch (error) {
            console.error(`Error generating TTS for page ${i + 1}:`, error);
            pagesWithAudio.push(page);
          }
        }

        setProgress(95);
        setCurrentIndex(4);

        // Navigate to show page with completed data
        setTimeout(() => {
          navigate("/create_show", { 
            state: { pages: pagesWithAudio },
            replace: true 
          });
        }, 1000);

      } catch (error) {
        console.error("Error processing story:", error);
        toast.error("동화책 생성 중 오류가 발생했습니다");
        setTimeout(() => navigate("/create_input"), 2000);
      }
    };

    processStory();
  }, [storyData, navigate]);


  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center space-y-8 max-w-md w-full">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground animate-pulse-slow">
          {loadingMessages[currentIndex]}
        </h1>
        
        <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <p className="text-muted-foreground text-sm">{Math.round(progress)}%</p>
        
        <div className="flex justify-center gap-2">
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-3 h-3 bg-secondary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-3 h-3 bg-accent rounded-full animate-bounce"></div>
        </div>
      </div>
    </div>
  );
};

export default CreateLoading;
