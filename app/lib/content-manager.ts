// app/lib/content-manager.ts
import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import {
  ScheduledContent,
  ContentTemplate,
  ContentVariant,
  ContentGenerationRequest,
  MediaGenerationRequest,
  GeneratedMedia,
  DEFAULT_SCHEDULED_CONTENT
} from '../types/content';
import { KOLProfile } from '../types/kol';
import { GoogleGenerativeAI } from "@google/generative-ai";

const CONTENT_COLLECTION = 'scheduled_contents';
const TEMPLATE_COLLECTION = 'content_templates';
const MEDIA_COLLECTION = 'generated_media';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// === CONTENT GENERATION ===

export async function generateContentVariants(
  request: ContentGenerationRequest,
  kolProfile: KOLProfile
): Promise<ContentVariant[]> {
  const variants: ContentVariant[] = [];

  for (let i = 0; i < request.variants_count; i++) {
    for (const platform of request.platforms) {
      const variant = await generateSingleVariant(
        request,
        kolProfile,
        platform,
        i + 1
      );
      variants.push(variant);
    }
  }

  return variants;
}

async function generateSingleVariant(
  request: ContentGenerationRequest,
  kolProfile: KOLProfile,
  platform: string,
  variantNumber: number
): Promise<ContentVariant> {
  const prompt = buildGenerationPrompt(request, kolProfile, platform, variantNumber);

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    const result = await model.generateContent(prompt);
    const content = result.response.text();

    // Extract hashtags and mentions
    const hashtags = extractHashtags(content);
    const mentions = extractMentions(content);

    return {
      id: `variant_${Date.now()}_${variantNumber}_${platform}`,
      content: content,
      platform: platform as any,
      tone: kolProfile.personality.tone,
      length: content.length,
      hashtags,
      mentions,
      score: 0.85 // Mock score, có thể integrate scoring model
    };
  } catch (error) {
    console.error('Error generating variant:', error);
    return {
      id: `variant_${Date.now()}_${variantNumber}_${platform}`,
      content: "Error generating content",
      platform: platform as any,
      tone: kolProfile.personality.tone,
      length: 0,
      hashtags: [],
      mentions: []
    };
  }
}

function buildGenerationPrompt(
  request: ContentGenerationRequest,
  kolProfile: KOLProfile,
  platform: string,
  variantNumber: number
): string {
  const platformGuidelines = {
    facebook: "Facebook post (tối đa 500 từ, có thể dài)",
    instagram: "Instagram caption (tối đa 2200 ký tự, nhiều hashtags)",
    twitter: "Twitter post (tối đa 280 ký tự, súc tích)",
    tiktok: "TikTok caption (ngắn gọn, trending, có hashtags)"
  };

  const basePrompt = `
Bạn là ${kolProfile.name}, đang tạo content cho ${platform}.

PROFILE:
- Tone: ${kolProfile.personality.tone}
- Writing Style: ${kolProfile.personality.writing_style}
- Expertise: ${kolProfile.personality.expertise.join(', ')}
- Language: ${kolProfile.personality.language}
- Emoji usage: ${kolProfile.voice_characteristics.emoji_usage}

YÊU CẦU:
${request.custom_prompt || "Tạo một bài post hấp dẫn, engaging"}

PLATFORM: ${platformGuidelines[platform as keyof typeof platformGuidelines]}
VARIANT: #${variantNumber} (tạo phiên bản khác biệt, sáng tạo)

CHỦ ĐỀ CẤM: ${kolProfile.personality.forbidden_topics.join(', ')}

Tạo nội dung hoàn chỉnh ngay, không cần giải thích hay phần mở đầu.
  `.trim();

  return basePrompt;
}

function extractHashtags(content: string): string[] {
  const regex = /#[\w\u00C0-\u1EF9]+/g;
  const matches = content.match(regex);
  return matches ? matches.map(h => h.toLowerCase()) : [];
}

function extractMentions(content: string): string[] {
  const regex = /@[\w\u00C0-\u1EF9]+/g;
  const matches = content.match(regex);
  return matches || [];
}

// === MEDIA GENERATION ===

export async function generateMedia(
  request: MediaGenerationRequest
): Promise<GeneratedMedia> {
  // TODO: Integrate với DALL-E, Midjourney, Runway, Pika APIs
  // Hiện tại return mock data

  const mockMedia: GeneratedMedia = {
    id: `media_${Date.now()}`,
    type: request.type === 'text-to-image' ? 'image' : 'video',
    url: `https://placeholder.com/${request.dimensions?.width || 1024}x${request.dimensions?.height || 1024}`,
    thumbnail_url: `https://placeholder.com/400x400`,
    prompt: request.prompt,
    provider: request.provider,
    metadata: {
      width: request.dimensions?.width || 1024,
      height: request.dimensions?.height || 1024,
      duration: request.duration,
      size_bytes: 0
    },
    createdAt: serverTimestamp() as Timestamp
  };

  // Save to Firestore
  const docRef = doc(collection(db, MEDIA_COLLECTION));
  await setDoc(docRef, mockMedia);

  return mockMedia;
}

// === SCHEDULED CONTENT CRUD ===

export async function createScheduledContent(
  data: Partial<ScheduledContent>
): Promise<string> {
  try {
    const newDocRef = doc(collection(db, CONTENT_COLLECTION));
    const content: ScheduledContent = {
      ...DEFAULT_SCHEDULED_CONTENT,
      ...data,
      id: newDocRef.id,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp
    } as ScheduledContent;

    await setDoc(newDocRef, content);
    return newDocRef.id;
  } catch (error) {
    console.error('Error creating scheduled content:', error);
    throw error;
  }
}

export async function getScheduledContent(id: string): Promise<ScheduledContent | null> {
  try {
    const docRef = doc(db, CONTENT_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as ScheduledContent;
    }
    return null;
  } catch (error) {
    console.error('Error getting scheduled content:', error);
    throw error;
  }
}

export async function getAllScheduledContents(kolId?: string): Promise<ScheduledContent[]> {
  try {
    let q = query(collection(db, CONTENT_COLLECTION), orderBy('scheduled_time', 'desc'));

    if (kolId) {
      q = query(q, where('kol_id', '==', kolId));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as ScheduledContent);
  } catch (error) {
    console.error('Error getting scheduled contents:', error);
    throw error;
  }
}

export async function updateScheduledContent(
  id: string,
  data: Partial<ScheduledContent>
): Promise<void> {
  try {
    const docRef = doc(db, CONTENT_COLLECTION, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating scheduled content:', error);
    throw error;
  }
}

export async function deleteScheduledContent(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, CONTENT_COLLECTION, id));
  } catch (error) {
    console.error('Error deleting scheduled content:', error);
    throw error;
  }
}

// === FACEBOOK POSTING ===

export async function postToFacebook(
  content: ScheduledContent,
  pageAccessToken: string
): Promise<{ success: boolean; post_id?: string; error?: string }> {
  try {
    const pageId = content.kol_id; // Assuming kol_id maps to page_id

    let body: any = {
      message: content.content
    };

    // Add media if exists
    if (content.media.length > 0) {
      const imageMedia = content.media.filter(m => m.type === 'image');
      if (imageMedia.length > 0) {
        body.url = imageMedia[0].url;
      }
    }

    const url = `https://graph.facebook.com/v24.0/${pageId}/feed?access_token=${pageAccessToken}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (data.error) {
      return { success: false, error: data.error.message };
    }

    return { success: true, post_id: data.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// === TEMPLATES ===

export async function getAllTemplates(): Promise<ContentTemplate[]> {
  try {
    const q = query(collection(db, TEMPLATE_COLLECTION), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as ContentTemplate);
  } catch (error) {
    console.error('Error getting templates:', error);
    return [];
  }
}

export async function createTemplate(data: Partial<ContentTemplate>): Promise<string> {
  try {
    const newDocRef = doc(collection(db, TEMPLATE_COLLECTION));
    const template = {
      ...data,
      id: newDocRef.id,
      createdAt: serverTimestamp()
    };

    await setDoc(newDocRef, template);
    return newDocRef.id;
  } catch (error) {
    console.error('Error creating template:', error);
    throw error;
  }
}
