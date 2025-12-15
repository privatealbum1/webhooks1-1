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
    // Loại bỏ id, createdAt, updatedAt khỏi DEFAULT để tránh lỗi type, sau đó mới gán lại
    const { id, createdAt, updatedAt, ...defaultData } = DEFAULT_KOL_PROFILE as any;
    
    const kolProfile: KOLProfile = {
      ...defaultData,
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

// ĐÃ SỬA: Mapping đúng với file Type mới của bạn
export function generateSystemPrompt(kol: KOLProfile): string {
  const { personality, voice_characteristics, demographic } = kol;
  
  return `
    Bạn là ${kol.name}, một KOL độ tuổi ${demographic.age_range} tại ${demographic.location}.
    Giới tính: ${demographic.gender}.
    
    MÔ TẢ BẢN THÂN:
    ${kol.description}
    
    TÍNH CÁCH & GIỌNG ĐIỆU:
    - Tone: ${personality.tone}
    - Phong cách viết: ${personality.writing_style}
    - Chuyên môn: ${personality.expertise.join(', ')}
    - Ngôn ngữ: ${personality.language}
    
    ĐẶC ĐIỂM GIAO TIẾP:
    - Câu chào mẫu: "${voice_characteristics.greeting_style}"
    - Câu kết mẫu: "${voice_characteristics.closing_style}"
    - Mức độ dùng Emoji: ${voice_characteristics.emoji_usage}
    - Catchphrases (nếu có): ${voice_characteristics.catchphrases.join(', ')}
    
    NHIỆM VỤ:
    - Trả lời tự nhiên như người thật trên Facebook.
    - Ngắn gọn, súc tích, đi thẳng vào vấn đề.
    - TUYỆT ĐỐI KHÔNG nhắc đến các chủ đề cấm: ${personality.forbidden_topics.join(', ')}.
    - Không xưng hô là AI hay Bot.
  `;
}

// Kiểm tra xem có nên trả lời không (dựa vào rules)
export function shouldReply(kol: KOLProfile): boolean {
  const { engagement_rules } = kol;
  
  // Check working hours
  if (engagement_rules.working_hours.enabled) {
    const now = new Date();
    // Chuyển đổi timezone nếu cần thiết (ở đây mặc định lấy giờ server/UTC hoặc cần xử lý thêm thư viện date-fns-tz nếu kỹ)
    // Code đơn giản lấy giờ hiện tại của môi trường chạy (Vercel server)
    const currentHour = now.getHours(); 
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    
    const [startHour, startMin] = engagement_rules.working_hours.start.split(':').map(Number);
    const [endHour, endMin] = engagement_rules.working_hours.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    // Nếu giờ hiện tại nằm ngoài khung giờ làm việc
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
  
  if (!kol || kol.status !== 'active') { // status trong Type của bạn là 'active', 'draft'...
    return null;
  }
  
  if (!shouldReply(kol)) {
    console.log(`KOL ${kol.name} skipped reply based on rules`);
    return null;
  }
  
  return kol;
}
