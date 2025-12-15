// app/api/content/post/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getScheduledContent, updateScheduledContent, postToFacebook } from '../../../lib/content-manager';

const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;

// POST - Publish content to Facebook
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content_id } = body;

    if (!content_id) {
      return NextResponse.json(
        { error: 'Missing content_id' },
        { status: 400 }
      );
    }

    if (!PAGE_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: 'Facebook access token not configured' },
        { status: 500 }
      );
    }

    // Get scheduled content
    const content = await getScheduledContent(content_id);
    if (!content) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }

    // Post to Facebook
    const result = await postToFacebook(content, PAGE_ACCESS_TOKEN);

    if (result.success) {
      // Update status to posted
      await updateScheduledContent(content_id, {
        status: 'posted',
        post_id: result.post_id
      });

      return NextResponse.json({
        success: true,
        post_id: result.post_id,
        message: 'Content posted successfully'
      });
    } else {
      // Update status to failed
      await updateScheduledContent(content_id, {
        status: 'failed',
        error_message: result.error
      });

      return NextResponse.json(
        { error: result.error || 'Failed to post content' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error posting content:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to post content' },
      { status: 500 }
    );
  }
}
