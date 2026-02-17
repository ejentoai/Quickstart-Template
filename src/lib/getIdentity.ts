import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { v4 as uuidv4 } from 'uuid'

export async function getIdentity() {
  const isAuthFlow = process.env.NEXT_PUBLIC_AUTH_FLOW === 'true'
  const cookieStore = await cookies() // No await needed; cookies() is sync

  if (isAuthFlow) {
    const userInfoCookie = cookieStore.get('user_info')?.value
    if (!userInfoCookie) {
      throw new Error('User not authenticated')
    }

    let userIdFromCookie: string | number | null = null
    try {
      const userInfo = JSON.parse(userInfoCookie)
      userIdFromCookie = userInfo?.data?.id ?? null
    } catch (err) {
      throw new Error('Invalid user_info cookie')
    }

    if (!userIdFromCookie) {
      throw new Error('User ID not found in cookie')
    }

    // ✅ Lookup the user in the DB by userInfo ID
    const userRecord = await prisma.user.findUnique({
      where: { userId: Number(userIdFromCookie) }, // assuming user_info.data.id maps to User.id
    })

    if (!userRecord) {
      throw new Error('User not found in DB')
    }

    return {
      ownerType: 'user',
      ownerUserId: userRecord.id, // primary key from DB
      ownerSessionId: null,
    }
  }

  // ==============================
  // SESSION FLOW
  // ==============================
  let sessionId = cookieStore.get('sessionId')?.value

  let session = null

  if (sessionId) {
    session = await prisma.session.findUnique({
      where: { sessionId },
    })
  }

  // If no session found → create one
  if (!session) {
    sessionId = uuidv4()

    session = await prisma.session.create({
      data: {
        sessionId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    // Set cookie
    cookieStore.set('sessionId', sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      expires: session.expiresAt,
    })
  }

  return {
    ownerType: 'session',
    ownerUserId: null,
    ownerSessionId: session.id,
  }
}
