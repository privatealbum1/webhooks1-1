// app/api/facebook/post/route.ts
// API endpoint for posting content to Facebook pages

import { NextRequest, NextResponse } from 'next/server';
import {
  postToFacebookPage,
  postPhotoToFacebookPage,
  postVideoToFacebookPage,
} from '../../../lib/facebook-client';
import { getKOLProfile } from '../../../lib/kol-manager';
import { db } from '../../../lib/firebase';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      kol_id,
      page_id,
      content_id, // optional - from content_library
      message,
      media_url,
      media_type, // 'photo' | 'video' | 'text'
      scheduled_time, // optional - unix timestamp
      link,
    } = body;

    // Validate required fields
    if (!kol_id || !page_id || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: kol_id, page_id, message' },
        { status: 400 }
      );
    }

    // Get KOL profile to retrieve page access token
    const kolProfile = await getKOLProfile(kol_id);
    if (!kolProfile) {
      return NextResponse.json(
        { success: false, error: 'KOL profile not found' },
        { status: 404 }
      );
    }

    // Find the page access token
    const pageToken = kolProfile.facebook_pages?.find(
      (p) => p.page_id === page_id
    )?.page_access_token;

    if (!pageToken) {
      return NextResponse.json(
        { success: false, error: 'Page access token not found for this page' },
        { status: 404 }
      );
    }

    let result;

    // Determine post type and call appropriate function
    if (media_type === 'photo' && media_url) {
      result = await postPhotoToFacebookPage(page_id, pageToken, media_url, message);
    } else if (media_type === 'video' && media_url) {
      result = await postVideoToFacebookPage(page_id, pageToken, media_url, message);
    } else {
      // Text post or link post
      const postContent = {
        message,
        link,
        published: !scheduled_time, // If scheduled, set published to false
        scheduled_publish_time: scheduled_time,
      };
      result = await postToFacebookPage(page_id, pageToken, postContent);
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    // Update content library if content_id provided
    if (content_id) {
      try {
        const contentRef = doc(db, 'content_library', content_id);
        await updateDoc(contentRef, {
          status: 'published',
          post_id: result.post_id,
          published_at: new Date(),
        });
      } catch (error) {
        console.error('Error updating content library:', error);
      }
    }

    // Update KOL stats
    try {
      const kolRef = doc(db, 'kol_profiles', kol_id);
      await updateDoc(kolRef, {
        'stats.total_posts': increment(1),
        'stats.last_active': new Date(),
      });
    } catch (error) {
      console.error('Error updating KOL stats:', error);
    }

    console.log(`✅ Successfully posted to Facebook page ${page_id}`);

    return NextResponse.json({
      success: true,
      post_id: result.post_id,
      message: 'Content posted successfully',
    });
  } catch (error) {
    console.error('❌ Error in POST /api/facebook/post:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
