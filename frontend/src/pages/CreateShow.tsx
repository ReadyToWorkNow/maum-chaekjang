import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { StoryPage } from "@/types/storybook";

const CreateShow = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const pages: StoryPage[] = location.state?.pages || [];
  
  const [currentPage, setCurrentPage] = useState(0);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const totalPages = pages.length + 1; // 마지막 빈 페이지 추가
  const isLastPage = currentPage === totalPages - 1;

  useEffect(() => {
    if (!pages || pages.length === 0) {
      toast.error("동화책 데이터가 없습니다");
      navigate("/create_input");
    }
  }, [pages, navigate]);

  // 현재 페이지 변경 시 오디오 자동 재생 (shouldAutoPlay가 true이고 마지막 페이지가 아닐 때만)
  useEffect(() => {
    if (audioRef.current && pages[currentPage]?.audioUrl && shouldAutoPlay && !isLastPage) {
      audioRef.current.src = pages[currentPage].audioUrl!;
      audioRef.current.play().catch(err => {
        console.error('오디오 재생 실패:', err);
      });
    }
  }, [currentPage, pages, shouldAutoPlay, isLastPage]);

  // 오디오 재생 완료 시 다음 페이지로 이동
  const handleAudioEnded = () => {
    if (currentPage < totalPages - 1) {
      setShouldAutoPlay(true);
      setCurrentPage(currentPage + 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      // 오디오 정지
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setShouldAutoPlay(true);
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 0) {
      // 오디오 정지
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setShouldAutoPlay(false); // 이전 버튼은 자동재생 안함
      setCurrentPage(currentPage - 1);
    }
  };

  if (!pages || pages.length === 0) {
    return null;
  }

  const currentStoryPage = pages[currentPage];
  const handleNewStory = () => {
    navigate("/create_input");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 md:p-8">
      <div className="w-full max-w-6xl animate-scale-in">
        <h1 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-6 md:mb-8">
          너의 이야기
        </h1>
        
        <div className="relative">
          {/* 책 컨테이너 */}
          <div className="bg-card rounded-3xl shadow-2xl overflow-hidden border-4 border-primary/20">
            <div className="grid grid-cols-1 md:grid-cols-2 min-h-[500px] md:min-h-[600px]">
              {isLastPage ? (
                // 마지막 빈 페이지
                <>
                  {/* 왼쪽 - 빈 페이지 */}
                  <div className="p-6 md:p-8 border-b-2 md:border-b-0 md:border-r-2 border-border flex items-center justify-center bg-muted/30">
                    <div className="text-center text-muted-foreground">
                      <p className="text-lg">끝</p>
                    </div>
                  </div>

                  {/* 오른쪽 - 새로운 이야기 버튼 */}
                  <div className="p-6 md:p-8 flex items-center justify-center">
                    <Button
                      onClick={handleNewStory}
                      size="lg"
                      className="text-lg px-8 py-6 animate-scale-in hover:scale-105 transition-transform"
                    >
                      새로운 이야기
                    </Button>
                  </div>
                </>
              ) : (
                // 일반 스토리 페이지
                <>
                  {/* 왼쪽 페이지 - 이미지만 */}
                  <div
                    key={`left-${currentPage}`}
                    className="p-6 md:p-8 border-b-2 md:border-b-0 md:border-r-2 border-border flex items-center justify-center animate-fade-in"
                  >
                    <div className="w-full h-full flex items-center justify-center">
                      {currentStoryPage?.imageUrl ? (
                        <img 
                          src={currentStoryPage.imageUrl} 
                          alt={`Page ${currentStoryPage.page}`}
                          className="max-w-full max-h-[400px] md:max-h-[500px] rounded-lg object-contain"
                        />
                      ) : (
                        <div className="w-full h-64 md:h-96 bg-muted rounded-lg flex items-center justify-center">
                          <p className="text-muted-foreground">이미지 생성 중...</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 오른쪽 페이지 - 텍스트만 */}
                  <div
                    key={`right-${currentPage}`}
                    className="p-6 md:p-8 flex items-center justify-center animate-fade-in"
                  >
                    <div className="max-w-md">
                      <p className="text-lg md:text-xl leading-relaxed text-foreground whitespace-pre-wrap">
                        {currentStoryPage?.text}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 페이지 번호 표시 */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full">
              {pages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentPage ? "bg-primary w-6" : "bg-muted hover:bg-muted-foreground/50"
                  }`}
                  aria-label={`Go to page ${i + 1}`}
                />
              ))}
            </div>
          </div>

          {/* 이전 버튼 */}
          <Button
            variant="outline"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 md:-translate-x-1/3 rounded-full shadow-lg z-10"
            onClick={goToPrevPage}
            disabled={currentPage === 0}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>

          {/* 다음 버튼 */}
          <Button
            variant="outline"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 md:translate-x-1/3 rounded-full shadow-lg z-10"
            onClick={goToNextPage}
            disabled={currentPage === totalPages - 1}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>

        {/* 숨겨진 오디오 플레이어 */}
        <audio
          ref={audioRef}
          onEnded={handleAudioEnded}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default CreateShow;
