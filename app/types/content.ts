// app/types/content.ts
import { Timestamp } from "firebase/firestore";

export type PlatformType = "facebook" | "instagram" | "twitter" | "tiktok";
export type ContentType = "post" | "story" | "reel" | "carousel";
export type MediaType = "text" | "image" | "video" | "carousel";
export type ScheduleStatus = "draft" | "scheduled" | "posted" | "failed";
export type TemplateCategory = "promotional" | "educational" | "entertainment" | "engagement";

// Content Template
export interface ContentTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  prompt_structure: string;
  variables: string[]; // ["product_name", "benefit", "call_to_action"]
  sample_output: string;
  platforms: PlatformType[];
  createdAt: Timestamp;
}

// Generated Content Variant
export interface ContentVariant {
  id: string;
  content: string;
  platform: PlatformType;
  tone: string;
  length: number;
  hashtags: string[];
  mentions: string[];
  media_urls?: string[];
  score?: number; // AI confidence score
}

// Content Generation Request
export interface ContentGenerationRequest {
  kol_id: string;
  template_id?: string;
  custom_prompt?: string;
  platforms: PlatformType[];
  content_type: ContentType;
  variants_count: number; // số lượng variants muốn tạo
  media_generation?: {
    enabled: boolean;
    type: "dalle" | "midjourney" | "stable-diffusion";
    prompt?: string;
  };
}

// Media Generation
export interface MediaGenerationRequest {
  type: "text-to-image" | "text-to-video";
  prompt: string;
  style?: string;
  dimensions?: {
    width: number;
    height: number;
  };
  duration?: number; // for videos
  provider: "dalle" | "midjourney" | "runway" | "pika";
}

export interface GeneratedMedia {
  id: string;
  type: MediaType;
  url: string;
  thumbnail_url?: string;
  prompt: string;
  provider: string;
  metadata?: {
    width: number;
    height: number;
    duration?: number;
    size_bytes: number;
  };
  createdAt: Timestamp;
}

// Scheduled Content
export interface ScheduledContent {
  id: string;
  kol_id: string;
  content: string;
  media: GeneratedMedia[];
  platform: PlatformType;
  content_type: ContentType;
  scheduled_time: Timestamp;
  status: ScheduleStatus;
  post_id?: string; // FB post ID after posting
  error_message?: string;
  analytics?: {
    likes: number;
    comments: number;
    shares: number;
    reach: number;
  };
  created_by: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Carousel Item
export interface CarouselItem {
  id: string;
  image_url: string;
  caption?: string;
  link?: string;
  order: number;
}

export interface CarouselPost {
  id: string;
  title: string;
  items: CarouselItem[];
  total_items: number;
  kol_id: string;
  createdAt: Timestamp;
}

// Content Analytics
export interface ContentAnalytics {
  content_id: string;
  platform: PlatformType;
  impressions: number;
  engagement_rate: number;
  clicks: number;
  conversions: number;
  best_time_to_post: string;
  audience_demographics: {
    age_range: { [key: string]: number };
    gender: { [key: string]: number };
    locations: { [key: string]: number };
  };
  updatedAt: Timestamp;
}

// Default values
export const DEFAULT_CONTENT_TEMPLATE: Omit<ContentTemplate, 'id' | 'createdAt'> = {
  name: "",
  category: "promotional",
  description: "",
  prompt_structure: "",
  variables: [],
  sample_output: "",
  platforms: ["facebook"]
};

export const DEFAULT_SCHEDULED_CONTENT: Omit<ScheduledContent, 'id' | 'createdAt' | 'updatedAt' | 'scheduled_time'> = {
  kol_id: "",
  content: "",
  media: [],
  platform: "facebook",
  content_type: "post",
  status: "draft",
  created_by: ""
};
