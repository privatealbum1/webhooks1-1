// app/api/content/schedule/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  createScheduledContent,
  getAllScheduledContents,
  updateScheduledContent,
  deleteScheduledContent
} from '@/app/lib/content-manager';

// GET - Get all scheduled contents
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const kolId = searchParams.get('kol_id');

    const contents = await getAllScheduledContents(kolId || undefined);

    return NextResponse.json({
      success: true,
      contents
    });
  } catch (error: any) {
    console.error('Error getting scheduled contents:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get scheduled contents' },
      { status: 500 }
    );
  }
}

// POST - Create new scheduled content
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.kol_id || !body.content || !body.scheduled_time) {
      return NextResponse.json(
        { error: 'Missing required fields: kol_id, content, scheduled_time' },
        { status: 400 }
      );
    }

    const id = await createScheduledContent(body);

    return NextResponse.json({
      success: true,
      id
    });
  } catch (error: any) {
    console.error('Error creating scheduled content:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create scheduled content' },
      { status: 500 }
    );
  }
}

// PATCH - Update scheduled content
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing content id' },
        { status: 400 }
      );
    }

    await updateScheduledContent(id, updateData);

    return NextResponse.json({
      success: true
    });
  } catch (error: any) {
    console.error('Error updating scheduled content:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update scheduled content' },
      { status: 500 }
    );
  }
}

// DELETE - Delete scheduled content
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing content id' },
        { status: 400 }
      );
    }

    await deleteScheduledContent(id);

    return NextResponse.json({
      success: true
    });
  } catch (error: any) {
    console.error('Error deleting scheduled content:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete scheduled content' },
      { status: 500 }
    );
  }
}
