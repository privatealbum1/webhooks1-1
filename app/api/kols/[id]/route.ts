// app/api/kols/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getKOLProfile, updateKOLProfile, deleteKOLProfile } from '../../../lib/kol-manager';
import { KOLProfile } from '../../../types/kol';

// GET: Lấy thông tin 1 KOL
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // <-- SỬA: Thêm Promise
) {
  try {
    const { id } = await params; // <-- SỬA: Phải await params trước

    const profile = await getKOLProfile(id);
    
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'KOL profile not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: profile });
  } catch (error: any) {
    console.error('Error fetching KOL profile:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PATCH: Cập nhật KOL profile
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // <-- SỬA
) {
  try {
    const { id } = await params; // <-- SỬA
    const body = await request.json();
    
    // Kiểm tra profile có tồn tại không
    const existingProfile = await getKOLProfile(id);
    if (!existingProfile) {
      return NextResponse.json(
        { success: false, error: 'KOL profile not found' },
        { status: 404 }
      );
    }
    
    await updateKOLProfile(id, body as Partial<KOLProfile>);
    
    return NextResponse.json({ 
      success: true, 
      message: 'KOL profile updated successfully' 
    });
  } catch (error: any) {
    console.error('Error updating KOL profile:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Xóa KOL profile
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // <-- SỬA
) {
  try {
    const { id } = await params; // <-- SỬA

    const existingProfile = await getKOLProfile(id);
    if (!existingProfile) {
      return NextResponse.json(
        { success: false, error: 'KOL profile not found' },
        { status: 404 }
      );
    }
    
    await deleteKOLProfile(id);
    
    return NextResponse.json({ 
      success: true, 
      message: 'KOL profile deleted successfully' 
    });
  } catch (error: any) {
    console.error('Error deleting KOL profile:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
