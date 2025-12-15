// app/api/content/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getKOLProfile } from '@/app/lib/kol-manager';
import { generateContentVariants, generateMedia } from '@/app/lib/content-manager';
import { ContentGenerationRequest, MediaGenerationRequest } from '@/app/types/content';

export async function POST(request: NextRequest) {
  try {
    const body: ContentGenerationRequest = await request.json();

    // Validate required fields
    if (!body.kol_id || !body.platforms || body.platforms.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: kol_id, platforms' },
        { status: 400 }
      );
    }

    // Get KOL profile
    const kolProfile = await getKOLProfile(body.kol_id);
    if (!kolProfile) {
      return NextResponse.json(
        { error: 'KOL profile not found' },
        { status: 404 }
      );
    }

    // Generate content variants
    const variants = await generateContentVariants(body, kolProfile);

    // Generate media if requested
    let media = [];
    if (body.media_generation?.enabled && body.media_generation.prompt) {
      const mediaRequest: MediaGenerationRequest = {
        type: 'text-to-image',
        prompt: body.media_generation.prompt,
        provider: body.media_generation.type || 'dalle',
        dimensions: { width: 1024, height: 1024 }
      };

      const generatedMedia = await generateMedia(mediaRequest);
      media.push(generatedMedia);
    }

    return NextResponse.json({
      success: true,
      variants,
      media,
      kol_name: kolProfile.name
    });
  } catch (error: any) {
    console.error('Error generating content:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate content' },
      { status: 500 }
    );
  }
}
