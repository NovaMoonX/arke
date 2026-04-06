export interface ShareItem {
  id: string;
  sessionId: string;
  content: string;
  type: 'text' | 'image' | 'file';
  timestamp: number;
  uploadedBy: string;
}
