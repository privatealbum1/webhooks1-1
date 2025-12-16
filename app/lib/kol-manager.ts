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
    console.log(`🔍 Looking for KOL with pageId: ${pageId} in connected_pages array`);

    const q = query(
      collection(db, KOL_COLLECTION),
      where('connected_pages', 'array-contains', pageId),
      where('status', '==', 'active')
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log(`⚠️ No active KOL found with pageId ${pageId} in connected_pages`);

      // Try to find any KOL with this page (debug info)
      const allKolsQuery = query(collection(db, KOL_COLLECTION));
      const allKols = await getDocs(allKolsQuery);
      console.log(`📊 Total KOL profiles in database: ${allKols.size}`);

      allKols.forEach((doc) => {
        const data = doc.data();
        console.log(`  - KOL "${data.name}" (status: ${data.status})`);
        console.log(`    connected_pages: [${data.connected_pages?.join(', ') || 'none'}]`);
        console.log(`    facebook_pages: ${data.facebook_pages?.length || 0} pages`);
      });

      return null;
    }

    const kolData = querySnapshot.docs[0].data() as KOLProfile;
    console.log(`✅ Found KOL: "${kolData.name}" (id: ${kolData.id})`);
    return kolData;
  } catch (error) {
    console.error('❌ Error getting KOL by page ID:', error);
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

  console.log(`🎲 Checking if KOL "${kol.name}" should reply...`);

  // Check working hours
  if (engagement_rules.working_hours.enabled) {
    const now = new Date();
    // Convert to Vietnam timezone (UTC+7)
    const vietnamTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    const currentHour = vietnamTime.getHours();
    const currentMinute = vietnamTime.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const [startHour, startMin] = engagement_rules.working_hours.start.split(':').map(Number);
    const [endHour, endMin] = engagement_rules.working_hours.end.split(':').map(Number);

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    console.log(`  ⏰ Working hours check:`);
    console.log(`    Current time (Vietnam): ${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`);
    console.log(`    Working hours: ${engagement_rules.working_hours.start} - ${engagement_rules.working_hours.end}`);
    console.log(`    Timezone: ${engagement_rules.working_hours.timezone}`);

    // Nếu giờ hiện tại nằm ngoài khung giờ làm việc
    if (currentTime < startTime || currentTime > endTime) {
      console.log(`  ❌ Outside working hours - skipping reply`);
      return false;
    }
    console.log(`  ✅ Within working hours`);
  } else {
    console.log(`  ℹ️ Working hours check disabled`);
  }

  // Check probability
  const random = Math.random();
  const threshold = engagement_rules.response_probability;
  console.log(`  🎲 Probability check: ${(random * 100).toFixed(1)}% < ${(threshold * 100).toFixed(0)}% threshold?`);

  if (random < threshold) {
    console.log(`  ✅ Probability passed - will reply`);
    return true;
  } else {
    console.log(`  ❌ Probability failed - skipping reply`);
    return false;
  }
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
