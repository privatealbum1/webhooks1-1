// app/api/facebook/sync/route.ts
// API endpoint for syncing Facebook data (comments, messages, stats)

import { NextRequest, NextResponse } from 'next/server';
import { getPageInsights, getPageInfo, syncPostComments } from '../../../lib/facebook-client';
import { getKOLProfile, updateKOLStats } from '../../../lib/kol-manager';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { kol_id, page_id, sync_type = 'all' } = body;
    // sync_type: 'all' | 'stats' | 'comments' | 'messages'

    if (!kol_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: kol_id' },
        { status: 400 }
      );
    }

    // Get KOL profile
    const kolProfile = await getKOLProfile(kol_id);
    if (!kolProfile) {
      return NextResponse.json(
        { success: false, error: 'KOL profile not found' },
        { status: 404 }
      );
    }

    if (!kolProfile.facebook_pages || kolProfile.facebook_pages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No Facebook pages connected to this KOL' },
        { status: 400 }
      );
    }

    const results = {
      synced_pages: 0,
      synced_comments: 0,
      updated_stats: false,
      errors: [] as string[],
    };

    // Determine which pages to sync
    const pagesToSync = page_id
      ? kolProfile.facebook_pages.filter((p) => p.page_id === page_id)
      : kolProfile.facebook_pages;

    // Aggregate stats across all pages
    let totalFollowers = 0;
    let totalImpressions = 0;
    let totalEngagements = 0;
    let totalReach = 0;

    // Sync each page
    for (const page of pagesToSync) {
      try {
        const pageToken = page.page_access_token;

        // Sync stats
        if (sync_type === 'all' || sync_type === 'stats') {
          // Get page info for followers count
          const pageInfoResult = await getPageInfo(page.page_id, pageToken);
          if (pageInfoResult.success && pageInfoResult.data) {
            totalFollowers += pageInfoResult.data.followers_count || 0;
          }

          // Get page insights
          const insightsResult = await getPageInsights(page.page_id, pageToken);
          if (insightsResult.success && insightsResult.insights) {
            const insights = insightsResult.insights;
            totalImpressions += insights.page_impressions || 0;
            totalEngagements += insights.page_post_engagements || 0;
            totalReach += insights.page_engaged_users || 0;
          }
        }

        // Sync comments from recent posts
        if (sync_type === 'all' || sync_type === 'comments') {
          // Get recent posts from this page
          const postsQuery = query(
            collection(db, 'content_library'),
            where('kol_id', '==', kol_id),
            where('platform', '==', 'facebook'),
            where('status', '==', 'published')
          );
          const postsSnapshot = await getDocs(postsQuery);

          for (const postDoc of postsSnapshot.docs) {
            const postData = postDoc.data();
            if (postData.post_id) {
              const commentsResult = await syncPostComments(postData.post_id, pageToken);
              if (commentsResult.success) {
                results.synced_comments += commentsResult.comments?.length || 0;
              }
            }
          }
        }

        results.synced_pages++;
      } catch (error) {
        console.error(`Error syncing page ${page.page_id}:`, error);
        results.errors.push(`Page ${page.page_id}: ${String(error)}`);
      }
    }

    // Update KOL stats in Firestore
    if (sync_type === 'all' || sync_type === 'stats') {
      try {
        const kolRef = doc(db, 'kol_profiles', kol_id);

        // Calculate engagement rate
        const engagementRate = totalImpressions > 0
          ? (totalEngagements / totalImpressions) * 100
          : 0;

        await updateDoc(kolRef, {
          'stats.followers_count': totalFollowers,
          'stats.impressions': totalImpressions,
          'stats.total_reactions': totalEngagements,
          'stats.reach': totalReach,
          'stats.engagement_rate': parseFloat(engagementRate.toFixed(2)),
          'stats.last_synced': new Date(),
        });

        results.updated_stats = true;
        console.log(`✅ Updated stats for KOL ${kol_id}:`, {
          followers: totalFollowers,
          impressions: totalImpressions,
          engagements: totalEngagements,
          reach: totalReach,
          engagement_rate: engagementRate.toFixed(2),
        });
      } catch (error) {
        console.error('Error updating KOL stats:', error);
        results.errors.push(`Stats update: ${String(error)}`);
      }
    }

    return NextResponse.json({
      success: true,
      kol_id,
      sync_type,
      results,
    });
  } catch (error) {
    console.error('❌ Error in POST /api/facebook/sync:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to sync all KOLs at once (cron job)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cronSecret = searchParams.get('secret');

    // Verify cron secret (for security)
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all KOL profiles
    const kolsRef = collection(db, 'kol_profiles');
    const kolsSnapshot = await getDocs(kolsRef);

    const results = [];

    for (const kolDoc of kolsSnapshot.docs) {
      try {
        const kolId = kolDoc.id;
        const kolData = kolDoc.data();

        if (!kolData.facebook_pages || kolData.facebook_pages.length === 0) {
          continue;
        }

        // Sync stats for this KOL
        const response = await fetch(`${request.nextUrl.origin}/api/facebook/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kol_id: kolId,
            sync_type: 'stats',
          }),
        });

        const result = await response.json();
        results.push({
          kol_id: kolId,
          success: result.success,
        });
      } catch (error) {
        console.error(`Error syncing KOL ${kolDoc.id}:`, error);
        results.push({
          kol_id: kolDoc.id,
          success: false,
          error: String(error),
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Batch sync completed',
      synced_kols: results.filter((r) => r.success).length,
      total_kols: results.length,
      results,
    });
  } catch (error) {
    console.error('❌ Error in GET /api/facebook/sync:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
