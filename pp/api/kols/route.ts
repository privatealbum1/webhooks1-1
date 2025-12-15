// app/api/kols/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createKOLProfile, getAllKOLProfiles } from '../../lib/kol-manager';
import { KOLProfile } from '../../types/kol';

// GET: Lấy tất cả KOL profiles
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId'); // Optional filter
    
    const profiles = await getAllKOLProfiles(userId || undefined);
    
    return NextResponse.json({ 
      success: true, 
      data: profiles,
      count: profiles.length 
    });
  } catch (error: any) {
    console.error('Error fetching KOL profiles:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch profiles' },
      { status: 500 }
    );
  }
}

// POST: Tạo KOL profile mới
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validation cơ bản
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'KOL name is required' },
        { status: 400 }
      );
    }
    
    const profileId = await createKOLProfile(body as Partial<KOLProfile>);
    
    return NextResponse.json({ 
      success: true, 
      data: { id: profileId },
      message: 'KOL profile created successfully'
    });
  } catch (error: any) {
    console.error('Error creating KOL profile:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create profile' },
      { status: 500 }
    );
  }
}
