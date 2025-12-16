// app/types/kol.ts
import { Timestamp } from "firebase/firestore";

export type ToneType = "friendly" | "professional" | "humorous" | "motivational" | "storyteller";
export type WritingStyle = "concise" | "detailed" | "casual" | "formal";
export type EmojiUsage = "none" | "low" | "medium" | "high";
export type ContentStatus = "draft" | "active" | "paused" | "archived";

export interface KOLPersonality {
  tone: ToneType;
  writing_style: WritingStyle;
  expertise: string[]; // ["fitness", "nutrition", "lifestyle"]
  forbidden_topics: string[]; // Chủ đề không bao giờ nói
  response_template: string; // Template mẫu cho câu trả lời
  language: "vi" | "en" | "both";
  signature_phrases: string[]; // Câu nói đặc trưng
}

export interface VoiceCharacteristics {
  catchphrases: string[]; // "Xin chào mọi người!", "Let's go!"
  emoji_usage: EmojiUsage;
  hashtag_style: string[]; // ["#MotivationMonday", "#FitnessJourney"]
  greeting_style: string; // "Chào bạn nha!", "Hi there!"
  closing_style: string; // "See you!", "Hẹn gặp lại!"
}

export interface Demographic {
  age_range: string; // "25-35"
  gender: "male" | "female" | "other" | "neutral";
  target_audience: string; // "Young professionals, fitness enthusiasts"
  location: string; // "Vietnam", "Global"
}

export interface EngagementRules {
  auto_reply_comments: boolean;
  auto_reply_messages: boolean;
  reply_delay_seconds: number; // 10-60s để giả lập người thật
  max_replies_per_hour: number; // Giới hạn để tránh spam
  working_hours: {
    enabled: boolean;
    start: string; // "09:00"
    end: string; // "22:00"
    timezone: string; // "Asia/Ho_Chi_Minh"
  };
  response_probability: number; // 0.8 = 80% trả lời, 20% skip
}

export interface FacebookPageConnection {
  page_id: string;
  page_name: string;
  page_access_token: string;
}

export interface KOLStats {
  total_comments_replied: number;
  total_messages_replied: number;
  avg_response_time_seconds: number;
  last_active: Timestamp | null;

  // New engagement metrics
  followers_count: number;
  total_likes: number;
  total_shares: number;
  total_reactions: number;
  engagement_rate: number; // (likes + comments + shares) / followers * 100
  reach: number; // Total people reached
  impressions: number; // Total times content was viewed
}

export interface KOLProfile {
  id: string;
  name: string;
  avatar: string; // URL
  description: string;
  personality: KOLPersonality;
  voice_characteristics: VoiceCharacteristics;
  demographic: Demographic;
  engagement_rules: EngagementRules;
  connected_pages: string[]; // List of FB Page IDs (legacy)
  facebook_pages?: FacebookPageConnection[]; // Full page info with tokens
  stats: KOLStats;
  status: ContentStatus;
  created_by: string; // User ID
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Default values cho form
export const DEFAULT_KOL_PROFILE: Omit<KOLProfile, 'id' | 'createdAt' | 'updatedAt'> = {
  name: "",
  avatar: "",
  description: "",
  personality: {
    tone: "friendly",
    writing_style: "casual",
    expertise: [],
    forbidden_topics: ["politics", "religion"],
    response_template: "",
    language: "vi",
    signature_phrases: []
  },
  voice_characteristics: {
    catchphrases: [],
    emoji_usage: "medium",
    hashtag_style: [],
    greeting_style: "Chào bạn!",
    closing_style: "Hẹn gặp lại nhé!"
  },
  demographic: {
    age_range: "25-35",
    gender: "neutral",
    target_audience: "",
    location: "Vietnam"
  },
  engagement_rules: {
    auto_reply_comments: true,
    auto_reply_messages: true,
    reply_delay_seconds: 15,
    max_replies_per_hour: 50,
    working_hours: {
      enabled: true,
      start: "09:00",
      end: "22:00",
      timezone: "Asia/Ho_Chi_Minh"
    },
    response_probability: 0.9
  },
  connected_pages: [],
  stats: {
    total_comments_replied: 0,
    total_messages_replied: 0,
    avg_response_time_seconds: 0,
    last_active: null,
    followers_count: 0,
    total_likes: 0,
    total_shares: 0,
    total_reactions: 0,
    engagement_rate: 0,
    reach: 0,
    impressions: 0
  },
  status: "draft",
  created_by: ""
};

// AI Prompt Generator
export function generateSystemPrompt(kol: KOLProfile): string {
  const { personality, voice_characteristics, demographic } = kol;
  
  return `Bạn là ${kol.name}, một KOL ${demographic.age_range} tuổi ở ${demographic.location}.

TÍNH CÁCH:
- Giọng điệu: ${personality.tone}
- Phong cách viết: ${personality.writing_style}
- Ngôn ngữ chính: ${personality.language === "vi" ? "Tiếng Việt" : personality.language === "en" ? "English" : "Cả Tiếng Việt & English"}

CHUYÊN MÔN:
${personality.expertise.map(e => `- ${e}`).join('\n')}

PHONG CÁCH GIAO TIẾP:
- Câu chào: "${voice_characteristics.greeting_style}"
- Câu kết: "${voice_characteristics.closing_style}"
- Emoji: ${voice_characteristics.emoji_usage === "high" ? "Dùng nhiều emoji 😊💪✨" : voice_characteristics.emoji_usage === "medium" ? "Dùng vừa phải" : "Ít hoặc không dùng emoji"}
${voice_characteristics.catchphrases.length > 0 ? `- Câu nói đặc trưng: ${voice_characteristics.catchphrases.join(', ')}` : ''}

CHỦ ĐỀ CẤM:
${personality.forbidden_topics.map(t => `- Không bao giờ nói về ${t}`).join('\n')}

ĐỐI TƯỢNG:
Target audience của bạn là: ${demographic.target_audience}

NHIỆM VỤ:
Trả lời tin nhắn/comment theo đúng phong cách trên. Giữ câu trả lời ngắn gọn (1-3 câu) trừ khi cần giải thích chi tiết.`;
}
