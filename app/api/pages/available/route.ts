// app/api/pages/available/route.ts
// Get all registered Facebook pages in the system

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const pagesRef = collection(db, 'registered_pages');
    const snapshot = await getDocs(pagesRef);

    const pages = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();

      // Test if token is still valid
      let tokenStatus = 'unknown';
      try {
        const testUrl = `https://graph.facebook.com/v24.0/${doc.id}?fields=name,fan_count&access_token=${data.accessToken}`;
        const testResponse = await fetch(testUrl);
        const testData = await testResponse.json();

        if (testData.error) {
          tokenStatus = 'invalid';
        } else {
          tokenStatus = 'valid';
        }
      } catch (error) {
        tokenStatus = 'error';
      }

      pages.push({
        page_id: doc.id,
        page_name: data.pageName,
        page_access_token: data.accessToken,
        is_active: data.isActive,
        token_status: tokenStatus,
        updated_at: data.updatedAt,
      });
    }

    // Sort by name
    pages.sort((a, b) => a.page_name.localeCompare(b.page_name));

    return NextResponse.json({
      success: true,
      pages,
      total: pages.length,
    });
  } catch (error) {
    console.error('Error fetching available pages:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
