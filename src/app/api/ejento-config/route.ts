import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/getUserId";

const AUTH_ENABLED = process.env.AUTH_ENABLED === "true";

export async function GET(req: Request) {
  try {
    const userId = await getUserId();
    if (AUTH_ENABLED && !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const finalUserId = userId || "NO_AUTH_USER";
    const config = await prisma.ejentoConfig.findUnique({
      where: { userId: finalUserId },
    });
    return NextResponse.json(config || null);

  } catch (error: any) {
    console.error("GET Config Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch config" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getUserId();
    if (AUTH_ENABLED && !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { baseUrl, apiKey, ejentoAccessToken, agentId } = body;

    if (!baseUrl || !apiKey || !agentId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const finalUserId = userId || "NO_AUTH_USER";
    const config = await prisma.ejentoConfig.upsert({
      where: { userId: finalUserId },
      update: {
        baseUrl,
        apiKey,
        ejentoAccessToken: ejentoAccessToken || null,
        agentId: Number(agentId),
      },
      create: {
        userId: finalUserId,
        baseUrl,
        apiKey,
        ejentoAccessToken : ejentoAccessToken || null,
        agentId: Number(agentId),
      },
    });

    return NextResponse.json(config);

  } catch (error: any) {
    console.error("POST Config Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upsert config" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
 
  try {
    const userId = await getUserId();

    if (AUTH_ENABLED && !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const finalUserId = userId || "NO_AUTH_USER";

    await prisma.ejentoConfig.delete({
      where: { userId: finalUserId },
    });

    return NextResponse.json({ message: "Config deleted successfully" });

  } catch (error: any) {
    console.error("DELETE Config Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete config" },
      { status: 500 }
    );
  }
}
