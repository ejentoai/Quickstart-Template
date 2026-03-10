import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const existingSession = request.cookies.get('session_id')?.value;
    
    if (existingSession) {
      return NextResponse.json(
        { message: 'session already exists' },
        { status: 200 } 
      );
    }
    
    const sessionId = uuidv4();
    const dbExpiry = new Date();
    dbExpiry.setDate(dbExpiry.getDate() + 30);

    await prisma.session.create({
      data: {
        sessionId,
        expiresAt: dbExpiry
      }
    });
   
    const response = NextResponse.json(
      { message: 'session created' },
      { status: 200 }
    );
    
    response.cookies.set('session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, 
    });

    return response;
  } catch (error) {
    console.error('Session creation error:', error);
    return NextResponse.json(
      { error: `unable to create session: ${error}` },
      { status: 500 }
    );
  }
} 