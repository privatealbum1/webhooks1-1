// app/api/facebook/analytics/route.ts
// API endpoint for fetching Facebook analytics

import { NextRequest, NextResponse } from 'next/server';
import { getPageInsights, getPostAnalytics, getPageInfo } from '../../../lib/facebook-client';
import { getKOLProfile } from '../../../lib/kol-manager';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get('pageId');
    const kolId = searchParams.get('kolId');
    const dateRange = searchParams.get('dateRange') || '7d'; // 7d, 28d, 90d
    const postId = searchParams.get('postId'); // Optional - for specific post analytics

    if (!pageId && !kolId) {
      return NextResponse.json(
        { success: false, error: 'Either pageId or kolId is required' },
        { status: 400 }
      );
    }

    let targetPageId = pageId;
    let pageAccessToken = '';

    // If kolId provided, find all pages for this KOL
    if (kolId) {
      const kolProfile = await getKOLProfile(kolId);
      if (!kolProfile) {
        return NextResponse.json(
          { success: false, error: 'KOL profile not found' },
          { status: 404 }
        );
      }

      // Get analytics for all pages of this KOL
      if (!pageId && kolProfile.facebook_pages && kolProfile.facebook_pages.length > 0) {
        const allPageAnalytics = [];

        for (const page of kolProfile.facebook_pages) {
          const pageToken = page.page_access_token;

          // Get page info
          const pageInfoResult = await getPageInfo(page.page_id, pageToken);

          // Get page insights
          const period = dateRange === '28d' ? 'days_28' : 'day';
          const insightsResult = await getPageInsights(page.page_id, pageToken, undefined, period);

          if (pageInfoResult.success && insightsResult.success) {
            allPageAnalytics.push({
              page_id: page.page_id,
              page_name: pageInfoResult.data?.name,
              followers: pageInfoResult.data?.followers_count || 0,
              insights: insightsResult.insights,
            });
          }
        }

        return NextResponse.json({
          success: true,
          kol_id: kolId,
          date_range: dateRange,
          pages: allPageAnalytics,
        });
      }

      // If specific pageId, find token for that page
      if (pageId) {
        const page = kolProfile.facebook_pages?.find((p) => p.page_id === pageId);
        if (!page) {
          return NextResponse.json(
            { success: false, error: 'Page not found in KOL profile' },
            { status: 404 }
          );
        }
        pageAccessToken = page.page_access_token;
        targetPageId = pageId;
      }
    } else if (pageId) {
      // pageId provided without kolId - need to find KOL that owns this page
      const kolProfilesRef = collection(db, 'kol_profiles');
      const q = query(kolProfilesRef);
      const snapshot = await getDocs(q);

      let foundToken = '';
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const page = data.facebook_pages?.find((p: any) => p.page_id === pageId);
        if (page) {
          foundToken = page.page_access_token;
          break;
        }
      }

      if (!foundToken) {
        return NextResponse.json(
          { success: false, error: 'Page access token not found' },
          { status: 404 }
        );
      }
      pageAccessToken = foundToken;
    }

    // If postId provided, get specific post analytics
    if (postId) {
      const postAnalyticsResult = await getPostAnalytics(postId, pageAccessToken);
      if (!postAnalyticsResult.success) {
        return NextResponse.json(
          { success: false, error: postAnalyticsResult.error },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        post_analytics: postAnalyticsResult.analytics,
      });
    }

    // Get page info
    const pageInfoResult = await getPageInfo(targetPageId, pageAccessToken);
    if (!pageInfoResult.success) {
      return NextResponse.json(
        { success: false, error: pageInfoResult.error },
        { status: 500 }
      );
    }

    // Get page insights
    const period = dateRange === '28d' ? 'days_28' : 'day';
    const insightsResult = await getPageInsights(targetPageId, pageAccessToken, undefined, period);

    if (!insightsResult.success) {
      return NextResponse.json(
        { success: false, error: insightsResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      page_id: targetPageId,
      page_name: pageInfoResult.data?.name,
      page_info: pageInfoResult.data,
      insights: insightsResult.insights,
      date_range: dateRange,
    });
  } catch (error) {
    console.error('❌ Error in GET /api/facebook/analytics:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
