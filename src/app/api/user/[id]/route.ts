import { NextResponse, NextRequest } from "next/server";
import { prisma } from '@/lib/prisma'

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
  ) {
    try {
      if (!params?.id) {
        return NextResponse.json({ error: "User ID is required" }, { status: 400 });
      }
  
      await prisma.user.delete({
        where: { userId : Number(params.id) },
      });
  
      return NextResponse.json({ message: "User deleted" }, { status : 200});
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }