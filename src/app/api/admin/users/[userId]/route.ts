import { NextRequest, NextResponse } from 'next/server';
import { getServerAdminClient } from '@/lib/supabaseServerClient';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const supabase = getServerAdminClient();
    const { data, error } = await supabase.auth.admin.getUserById(userId);

    if (error) {
      console.error('Error fetching user:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ user: data.user });
  } catch (error) {
    console.error('Unexpected error in getUserById:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
