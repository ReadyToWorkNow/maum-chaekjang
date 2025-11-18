import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-8 animate-fade-in">
        <h1 className="text-6xl font-bold text-foreground mb-4">
          마음의 책장
        </h1>
        <p className="text-2xl text-muted-foreground mb-8">
          상상했던 이야기가 현실이 되는 곳
        </p>
        <Button
          onClick={() => navigate("/auth")}
          size="lg"
          className="bg-primary hover:bg-primary/80 text-primary-foreground rounded-full px-12 py-6 text-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg"
        >
          이야기 만들기
        </Button>
      </div>
    </div>
  );
};

export default Home;
