export interface StoryPage {
  page: number;
  text: string;
  image_prompt: string;
  imageUrl?: string;
  audioUrl?: string;
}

export interface StoryData {
  pages: StoryPage[];
}
