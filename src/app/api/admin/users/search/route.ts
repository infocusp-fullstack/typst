import { NextRequest, NextResponse } from 'next/server';
import { getServerAdminClient } from '@/lib/supabaseServerClient';
import { APP_CONFIG } from '@/lib/config';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const perPage = parseInt(searchParams.get('perPage') || '1000', 10);

    if (query.length > APP_CONFIG.validation.maxSearchQueryLength) {
      return NextResponse.json(
        { error: `Search query too long. Maximum ${APP_CONFIG.validation.maxSearchQueryLength} characters` },
        { status: 400 }
      );
    }

    const supabase = getServerAdminClient();
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      console.error('Error listing users:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const filteredUsers = query
      ? data.users.filter((user) => {
          const email = user.email?.toLowerCase() || '';
          const searchLower = query.toLowerCase();
          return email.includes(searchLower);
        })
      : data.users;

    return NextResponse.json({ users: filteredUsers });
  } catch (error) {
    console.error('Unexpected error in searchUsers:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
