import { cookies } from 'next/headers'

export async function getUserId(): Promise<number | null> {
  const cookieStore = await cookies() 
  const userInfoCookie = cookieStore.get('user_info')?.value
  if (!userInfoCookie) return null

  try {
    const userInfo = JSON.parse(userInfoCookie)
    console.log(userInfo,'userinfo')
    const userId = userInfo?.data?.id
    return userId ? Number(userId) : null
  } catch (err) {
    console.error('Failed to parse user_info cookie', err)
    return null
  }
}
