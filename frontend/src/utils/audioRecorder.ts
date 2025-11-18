export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async start(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(this.stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }

  async stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder not initialized'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.cleanup();
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
  }

  downloadRecording(blob: Blob, filename: string = 'recording.webm'): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  async sendToWebhook(blob: Blob, webhookUrl: string): Promise<any> {
    const maxRetries = 3;
    const timeoutMs = 10000; // 10초 타임아웃
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const formData = new FormData();
        const timestamp = new Date().toISOString();

        // Add audio file to FormData
        formData.append('audio', blob, `recording-${timestamp}.webm`);
        formData.append('timestamp', timestamp);
        formData.append('mimeType', blob.type);
        formData.append('size', blob.size.toString());

        // 타임아웃 컨트롤러 설정
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        // Send to webhook using FormData with CORS-enabled endpoint
        const res = await fetch(webhookUrl, {
          method: "POST",
          body: formData,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const text = await res.text().catch(() => "");
        if (!res.ok) {
          throw new Error(`Webhook failed: ${res.status} ${res.statusText} ${text}`);
        }

        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      } catch (error) {
        lastError = error;
        console.error(`Webhook attempt ${attempt}/${maxRetries} failed:`, error);

        if (attempt < maxRetries) {
          // 재시도 전 대기 (2초)
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    // 모든 재시도 실패
    if (lastError instanceof Error && lastError.name === 'AbortError') {
      throw new Error('웹훅 응답 시간이 초과되었습니다. n8n 워크플로우가 Active 상태인지 확인해주세요.');
    }
    throw lastError || new Error('웹훅 전송에 실패했습니다.');
  }
}
