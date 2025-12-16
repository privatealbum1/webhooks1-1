// app/lib/facebook-client.ts
// Facebook Graph API Client for posting, analytics, and sync

const GRAPH_API_VERSION = 'v24.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export interface FacebookPost {
  message: string;
  link?: string;
  published: boolean;
  scheduled_publish_time?: number;
}

export interface FacebookMedia {
  url?: string;
  type: 'photo' | 'video';
}

export interface PageInsights {
  page_id: string;
  followers_count: number;
  page_impressions: number;
  page_engaged_users: number;
  page_post_engagements: number;
  page_posts_impressions: number;
}

export interface PostAnalytics {
  post_id: string;
  likes: number;
  shares: number;
  comments: number;
  reactions: number;
  reach: number;
  impressions: number;
  engagement_rate: number;
}

/**
 * Post text content to Facebook page
 */
export async function postToFacebookPage(
  pageId: string,
  pageAccessToken: string,
  content: FacebookPost
): Promise<{ success: boolean; post_id?: string; error?: string }> {
  try {
    const url = `${GRAPH_API_BASE}/${pageId}/feed`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: content.message,
        link: content.link,
        published: content.published,
        scheduled_publish_time: content.scheduled_publish_time,
        access_token: pageAccessToken,
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('❌ Facebook API error:', data.error);
      return { success: false, error: data.error.message };
    }

    console.log('✅ Posted to Facebook:', data.id);
    return { success: true, post_id: data.id };
  } catch (error) {
    console.error('❌ Error posting to Facebook:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Post photo to Facebook page
 */
export async function postPhotoToFacebookPage(
  pageId: string,
  pageAccessToken: string,
  photoUrl: string,
  caption?: string
): Promise<{ success: boolean; post_id?: string; error?: string }> {
  try {
    const url = `${GRAPH_API_BASE}/${pageId}/photos`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: photoUrl,
        caption: caption || '',
        access_token: pageAccessToken,
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('❌ Facebook API error:', data.error);
      return { success: false, error: data.error.message };
    }

    console.log('✅ Posted photo to Facebook:', data.id);
    return { success: true, post_id: data.post_id };
  } catch (error) {
    console.error('❌ Error posting photo to Facebook:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Post video to Facebook page
 */
export async function postVideoToFacebookPage(
  pageId: string,
  pageAccessToken: string,
  videoUrl: string,
  description?: string
): Promise<{ success: boolean; post_id?: string; error?: string }> {
  try {
    const url = `${GRAPH_API_BASE}/${pageId}/videos`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_url: videoUrl,
        description: description || '',
        access_token: pageAccessToken,
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('❌ Facebook API error:', data.error);
      return { success: false, error: data.error.message };
    }

    console.log('✅ Posted video to Facebook:', data.id);
    return { success: true, post_id: data.id };
  } catch (error) {
    console.error('❌ Error posting video to Facebook:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Fallback function - Get basic page insights one metric at a time
 * Used when batch insights API fails with error #100
 */
async function getBasicPageInsights(
  pageId: string,
  pageAccessToken: string
): Promise<{ success: boolean; insights?: PageInsights; error?: string }> {
  try {
    console.log('🔄 Trying basic insights approach (individual metrics)...');

    const insights: PageInsights = {
      page_id: pageId,
      followers_count: 0,
      page_impressions: 0,
      page_engaged_users: 0,
      page_post_engagements: 0,
      page_posts_impressions: 0,
    };

    // Try to get each metric individually
    const metricsToTry = [
      { name: 'page_fans', key: 'followers_count' },
      { name: 'page_impressions', key: 'page_impressions' },
      { name: 'page_engaged_users', key: 'page_engaged_users' },
      { name: 'page_post_engagements', key: 'page_post_engagements' },
      { name: 'page_posts_impressions', key: 'page_posts_impressions' },
    ];

    let successCount = 0;

    for (const metric of metricsToTry) {
      try {
        const url = `${GRAPH_API_BASE}/${pageId}/insights/${metric.name}?period=day&access_token=${pageAccessToken}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.data && data.data.length > 0 && data.data[0].values) {
          const value = data.data[0].values[0]?.value || 0;
          (insights as any)[metric.key] = value;
          console.log(`  ✅ ${metric.name}: ${value}`);
          successCount++;
        } else if (data.error) {
          console.log(`  ⚠️ ${metric.name}: ${data.error.message}`);
        }
      } catch (err) {
        console.log(`  ⚠️ ${metric.name}: Failed to fetch`);
      }
    }

    if (successCount > 0) {
      console.log(`✅ Retrieved ${successCount}/${metricsToTry.length} metrics using fallback method`);
      return { success: true, insights };
    } else {
      return { success: false, error: 'Không thể lấy bất kỳ metric nào. Token có thể thiếu permissions.' };
    }
  } catch (error) {
    console.error('❌ Error in getBasicPageInsights:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Get page insights (analytics)
 */
export async function getPageInsights(
  pageId: string,
  pageAccessToken: string,
  metrics: string[] = [
    'page_fans',
    'page_impressions',
    'page_engaged_users',
    'page_post_engagements',
    'page_posts_impressions'
  ],
  period: 'day' | 'week' | 'days_28' = 'day'
): Promise<{ success: boolean; insights?: PageInsights; error?: string }> {
  try {
    const metricsParam = metrics.join(',');
    const url = `${GRAPH_API_BASE}/${pageId}/insights?metric=${metricsParam}&period=${period}&access_token=${pageAccessToken}`;

    console.log(`🔍 Fetching insights: ${GRAPH_API_BASE}/${pageId}/insights`);
    console.log(`📊 Metrics: ${metricsParam}, Period: ${period}`);

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error('❌ Facebook Insights API error:', JSON.stringify(data.error, null, 2));

      // Check for specific permission errors
      if (data.error.code === 190) {
        return { success: false, error: 'Access token đã hết hạn hoặc không hợp lệ. Vui lòng kết nối lại Facebook Page.' };
      }
      if (data.error.code === 200) {
        return { success: false, error: 'Không có quyền truy cập Page Insights. Token cần permissions: pages_read_engagement, read_insights' };
      }
      if (data.error.code === 100) {
        // Invalid metric - try safer approach with individual metrics
        console.log('⚠️ Some metrics invalid (Code 100), trying fallback method...');
        return await getBasicPageInsights(pageId, pageAccessToken);
      }

      return { success: false, error: `${data.error.message} (Code: ${data.error.code})` };
    }

    // Check if data exists
    if (!data.data || data.data.length === 0) {
      console.warn('⚠️ No insights data available for this page');
      return {
        success: false,
        error: 'Không có dữ liệu insights. Page có thể chưa có đủ hoạt động hoặc token thiếu permissions (pages_read_engagement, read_insights)'
      };
    }

    // Parse insights data
    const insights: PageInsights = {
      page_id: pageId,
      followers_count: 0,
      page_impressions: 0,
      page_engaged_users: 0,
      page_post_engagements: 0,
      page_posts_impressions: 0,
    };

    console.log(`📈 Processing ${data.data.length} metrics...`);

    data.data?.forEach((metric: any) => {
      const value = metric.values?.[0]?.value || 0;
      console.log(`  - ${metric.name}: ${value}`);

      switch (metric.name) {
        case 'page_fans':
          insights.followers_count = value;
          break;
        case 'page_impressions':
          insights.page_impressions = value;
          break;
        case 'page_engaged_users':
          insights.page_engaged_users = value;
          break;
        case 'page_post_engagements':
          insights.page_post_engagements = value;
          break;
        case 'page_posts_impressions':
          insights.page_posts_impressions = value;
          break;
      }
    });

    console.log('✅ Retrieved page insights:', insights);
    return { success: true, insights };
  } catch (error) {
    console.error('❌ Error getting page insights:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Get post analytics
 */
export async function getPostAnalytics(
  postId: string,
  pageAccessToken: string
): Promise<{ success: boolean; analytics?: PostAnalytics; error?: string }> {
  try {
    // Get post engagement data
    const url = `${GRAPH_API_BASE}/${postId}?fields=likes.summary(true),shares,comments.summary(true),reactions.summary(true)&access_token=${pageAccessToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error('❌ Facebook Post API error:', data.error);
      return { success: false, error: data.error.message };
    }

    // Get post insights (reach, impressions)
    const insightsUrl = `${GRAPH_API_BASE}/${postId}/insights?metric=post_impressions,post_engaged_users&access_token=${pageAccessToken}`;
    const insightsResponse = await fetch(insightsUrl);
    const insightsData = await insightsResponse.json();

    let reach = 0;
    let impressions = 0;

    insightsData.data?.forEach((metric: any) => {
      const value = metric.values?.[0]?.value || 0;
      if (metric.name === 'post_impressions') impressions = value;
      if (metric.name === 'post_engaged_users') reach = value;
    });

    const likes = data.likes?.summary?.total_count || 0;
    const shares = data.shares?.count || 0;
    const comments = data.comments?.summary?.total_count || 0;
    const reactions = data.reactions?.summary?.total_count || 0;

    const totalEngagements = likes + shares + comments;
    const engagement_rate = impressions > 0 ? (totalEngagements / impressions) * 100 : 0;

    const analytics: PostAnalytics = {
      post_id: postId,
      likes,
      shares,
      comments,
      reactions,
      reach,
      impressions,
      engagement_rate: parseFloat(engagement_rate.toFixed(2)),
    };

    console.log('✅ Retrieved post analytics:', analytics);
    return { success: true, analytics };
  } catch (error) {
    console.error('❌ Error getting post analytics:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Get page access token from user access token
 */
export async function getPageAccessToken(
  pageId: string,
  userAccessToken: string
): Promise<{ success: boolean; access_token?: string; error?: string }> {
  try {
    const url = `${GRAPH_API_BASE}/${pageId}?fields=access_token&access_token=${userAccessToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error('❌ Facebook API error:', data.error);
      return { success: false, error: data.error.message };
    }

    return { success: true, access_token: data.access_token };
  } catch (error) {
    console.error('❌ Error getting page access token:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Sync recent comments from a post
 */
export async function syncPostComments(
  postId: string,
  pageAccessToken: string
): Promise<{ success: boolean; comments?: any[]; error?: string }> {
  try {
    const url = `${GRAPH_API_BASE}/${postId}/comments?fields=id,message,from,created_time,parent&access_token=${pageAccessToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error('❌ Facebook Comments API error:', data.error);
      return { success: false, error: data.error.message };
    }

    console.log(`✅ Synced ${data.data?.length || 0} comments from post ${postId}`);
    return { success: true, comments: data.data || [] };
  } catch (error) {
    console.error('❌ Error syncing comments:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Get page info including followers count
 */
export async function getPageInfo(
  pageId: string,
  pageAccessToken: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const url = `${GRAPH_API_BASE}/${pageId}?fields=id,name,fan_count,followers_count,about,picture&access_token=${pageAccessToken}`;

    console.log(`🔍 Fetching page info from: ${GRAPH_API_BASE}/${pageId}?fields=...`);
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error('❌ Facebook Page API error:', JSON.stringify(data.error, null, 2));
      return { success: false, error: `${data.error.message} (Code: ${data.error.code}, Type: ${data.error.type})` };
    }

    console.log('✅ Retrieved page info:', {
      name: data.name,
      id: data.id,
      fan_count: data.fan_count,
      followers_count: data.followers_count
    });
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error getting page info:', error);
    return { success: false, error: String(error) };
  }
}
