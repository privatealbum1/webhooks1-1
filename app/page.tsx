// app/page.tsx
'use client';

import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    // Redirect to dashboard on load
    window.location.href = '/dashboard';
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600 text-lg">Đang chuyển hướng tới Dashboard...</p>
      </div>
    </div>
  );
}
