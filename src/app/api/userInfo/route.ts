import { NextRequest, NextResponse } from "next/server";
 
export async function GET(req: NextRequest) {
  try {
    const cookie = req.cookies.get("user_info")?.value;
 
    if (!cookie) {
      return NextResponse.json(
        { success: false, message: "User cookie not found" },
        { status: 401 }
      );
    }
 
    const decoded = decodeURIComponent(cookie);
    const parsed = JSON.parse(decoded);
 
    const userId = parsed?.data?.id;
 
    return NextResponse.json({
      success: true,
      user_id: userId,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to parse user cookie" },
      { status: 500 }
    );
  }
}
 