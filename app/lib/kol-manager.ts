// app/lib/kol-manager.ts
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
import { KOLProfile, DEFAULT_KOL_PROFILE } from '../types/kol';

const KOL_COLLECTION = 'kol_profiles';

// === CREATE ===
export async function createKOLProfile(data: Partial<KOLProfile>): Promise<string> {
  try {
    const newDocRef = doc(collection(db, KOL_COLLECTION));
    const kolProfile: KOLProfile = {
      ...DEFAULT_KOL_PROFILE,
      ...data,
      id: newDocRef.id,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp
    };
    
    await setDoc(newDocRef, kolProfile);
    return newDocRef.id;
  } catch (error) {
    console.error('Error creating KOL profile:', error);
    throw error;
  }
}

// === READ ===
// ĐÃ SỬA: Thêm từ khóa 'function'
export async function getKOLProfile(id: string): Promise<KOLProfile | null> {
  try {
    const docRef = doc(db, KOL_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as KOLProfile;
    }
    return null;
  } catch (error) {
    console.error('Error getting KOL profile:', error);
    throw error;
  }
}

// ĐÃ SỬA: Thêm từ khóa 'function'
export async function getAllKOLProfiles(userId?: string): Promise<KOLProfile[]> {
  try {
    let q = query(collection(db, KOL_COLLECTION), orderBy('createdAt', 'desc'));
    
    if (userId) {
      q = query(q, where('created_by', '==', userId));
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as KOLProfile);
  } catch (error) {
    console.error('Error getting KOL profiles:', error);
    throw error;
  }
}

// ĐÃ SỬA: Thêm từ khóa 'function'
export async function getKOLByPageId(pageId: string): Promise<KOLProfile | null> {
  try {
    const q = query(
      collection(db, KOL_COLLECTION),
      where('connected_pages', 'array-contains', pageId),
      where('status', '==', 'active')
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    return querySnapshot.docs[0].data() as KOLProfile;
  } catch (error) {
    console.error('Error getting KOL by page ID:', error);
    throw error;
  }
}

// === UPDATE ===
export async function updateKOLProfile(
  id: string, 
  data: Partial<KOLProfile>
): Promise<void> {
  try {
    const docRef = doc(db, KOL_COLLECTION, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating KOL profile:', error);
    throw error;
  }
}

// Cập nhật stats
export async function updateKOLStats(
  id: string,
  field: 'total_comments_replied' | 'total_messages_replied',
  increment: number = 1
): Promise<void> {
  try {
    const profile = await getKOLProfile(id);
    if (!profile) return;
    
    await updateDoc(doc(db, KOL_COLLECTION, id), {
      [`stats.${field}`]: profile.stats[field] + increment,
      'stats.last_active': serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating KOL stats:', error);
  }
}

// === DELETE ===
export async function deleteKOLProfile(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, KOL_COLLECTION, id));
  } catch (error) {
    console.error('Error deleting KOL profile:', error);
    throw error;
  }
}

// === BUSINESS LOGIC ===

// ĐÃ BỔ SUNG: Hàm generateSystemPrompt (Cái này thiếu gây lỗi build)
export function generateSystemPrompt(kol: KOLProfile): string {
  return `
    You are ${kol.name}, a ${kol.age}-year-old ${kol.gender} content creator.
    
    YOUR PERSONALITY:
    - Tone: ${kol.personality.tone}
    - Writing Style: ${kol.personality.writing_style}
    - Key Topics: ${kol.personality.topics.join(', ')}
    
    YOUR BACKGROUND:
    ${kol.bio}
    
    INSTRUCTIONS:
    - Reply naturally as a user on Facebook.
    - Keep it short, engaging, and relevant to the context.
    - Use Vietnamese language naturally.
    - Do not sound like an AI or a bot.
    - Emoji usage level: ${kol.personality.emoji_usage}.
  `;
}

// Kiểm tra xem có nên trả lời không (dựa vào rules)
export function shouldReply(kol: KOLProfile): boolean {
  const { engagement_rules } = kol;
  
  // Check working hours
  if (engagement_rules.working_hours.enabled) {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const currentTime = hour * 60 + minute;
    
    const [startHour, startMin] = engagement_rules.working_hours.start.split(':').map(Number);
    const [endHour, endMin] = engagement_rules.working_hours.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    if (currentTime < startTime || currentTime > endTime) {
      return false;
    }
  }
  
  // Check probability
  return Math.random() < engagement_rules.response_probability;
}

// Tính delay ngẫu nhiên để giả lập người thật
export function getHumanLikeDelay(kol: KOLProfile): number {
  const baseDelay = kol.engagement_rules.reply_delay_seconds;
  // Random ±30% để tự nhiên hơn
  const variance = baseDelay * 0.3;
  return Math.floor(baseDelay + (Math.random() * variance * 2 - variance));
}

// Thêm emoji theo style
export function addEmojis(text: string, usage: 'none' | 'low' | 'medium' | 'high'): string {
  const emojiSets = {
    positive: ['😊', '💪', '✨', '🎉', '👍', '❤️', '🔥', '⭐'],
    thinking: ['🤔', '💭', '🧐'],
    greeting: ['👋', '😄', '🙌']
  };
  
  if (usage === 'none') return text;
  
  const count = usage === 'high' ? 3 : usage === 'medium' ? 2 : 1;
  const emojis = emojiSets.positive;
  
  let result = text;
  for (let i = 0; i < count; i++) {
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    result += ' ' + emoji;
  }
  
  return result;
}

// Export để dùng trong webhook
export async function getKOLForResponse(pageId: string) {
  const kol = await getKOLByPageId(pageId);
  
  if (!kol || kol.status !== 'active') {
    return null;
  }
  
  if (!shouldReply(kol)) {
    console.log(`KOL ${kol.name} skipped reply based on rules`);
    return null;
  }
  
  return kol;
}
