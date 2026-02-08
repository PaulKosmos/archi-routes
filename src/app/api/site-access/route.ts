import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { password } = await request.json();
        const sitePassword = process.env.SITE_ACCESS_PASSWORD;

        if (!sitePassword) {
            console.error('SITE_ACCESS_PASSWORD is not configured');
            return NextResponse.json(
                { error: 'Site access is not configured' },
                { status: 500 }
            );
        }

        if (password === sitePassword) {
            const response = NextResponse.json({ success: true });

            // Set httpOnly cookie that expires in 30 days
            response.cookies.set('site_access_granted', 'true', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 30, // 30 days
                path: '/',
            });

            return response;
        }

        return NextResponse.json(
            { error: 'Invalid password' },
            { status: 401 }
        );
    } catch {
        return NextResponse.json(
            { error: 'Invalid request' },
            { status: 400 }
        );
    }
}
