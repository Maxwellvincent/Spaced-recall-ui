import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// This endpoint is called by Notion after the user authorizes the integration
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    
    if (error) {
      // Redirect to error page
      return NextResponse.redirect(new URL('/integrations/notion/error?error=' + error, url.origin));
    }
    
    if (!code || !state) {
      return NextResponse.redirect(new URL('/integrations/notion/error?error=missing_params', url.origin));
    }
    
    // Get the state from the cookie
    const cookieStore = cookies();
    const storedState = cookieStore.get('notion_oauth_state')?.value;
    
    // Verify state to prevent CSRF attacks
    if (!storedState || state !== storedState) {
      return NextResponse.redirect(new URL('/integrations/notion/error?error=invalid_state', url.origin));
    }
    
    // Store the code and state in cookies temporarily
    // The front-end will use these to complete the OAuth flow
    const response = NextResponse.redirect(new URL('/integrations/notion/success', url.origin));
    
    response.cookies.set('notion_oauth_code', code, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 5, // 5 minutes
    });
    
    // Clear the state cookie
    response.cookies.set('notion_oauth_state', '', { maxAge: 0 });
    
    return response;
  } catch (error) {
    console.error('Error handling Notion OAuth callback:', error);
    const url = new URL(request.url);
    return NextResponse.redirect(new URL('/integrations/notion/error?error=server_error', url.origin));
  }
} 