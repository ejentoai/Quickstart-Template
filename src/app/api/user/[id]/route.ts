import { NextResponse, NextRequest } from "next/server";
import { prisma } from '@/lib/prisma'

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    const numericId = Number(id)

    if (isNaN(numericId)) {
      return NextResponse.json(
        { error: "Invalid User ID" },
        { status: 400 }
      )
    }

    await prisma.user.delete({
      where: { userId: numericId },
    })

    return NextResponse.json(
      { message: "User deleted" },
      { status: 200 }
    )

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
