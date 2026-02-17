// app/api/threads/[id]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getIdentity } from '@/lib/getIdentity'

export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
      const threadId = parseInt(params.id);
  
      if (isNaN(threadId)) {
        return NextResponse.json({ error: "Invalid thread ID" }, { status: 400 });
      }
      
      const identity = await getIdentity()

      const thread = await prisma.thread.findFirst({
        where: {
          id: threadId,
          ...(identity.ownerType === "user"
            ? { ownerUserId: identity.ownerUserId }
            : { ownerSessionId: identity.ownerSessionId }),
        },
        include: { messages: true },
      });
  
      if (!thread) {
        return NextResponse.json({ error: "Thread not found" }, { status: 404 });
      }
  
      return NextResponse.json(thread);
    } catch (error) {
      console.error("Error fetching thread by ID:", error);
      return NextResponse.json(
        { error: "Unable to fetch thread" },
        { status: 500 }
      );
    }
  }


export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
  ) {
    try {
      const body = await req.json()
      const { title, metaData, externalApiId } = body // Changed from externalId
  
      const threadId = Number(params.id)
  
      if (!threadId || isNaN(threadId)) {
        return NextResponse.json({ error: 'Invalid thread id' }, { status: 400 })
      }
  
      const identity = await getIdentity()
  
      const existingThread = await prisma.thread.findFirst({
        where: {
          id: threadId,
          ...(identity.ownerType === 'user'
            ? { ownerUserId: identity.ownerUserId }
            : { ownerSessionId: identity.ownerSessionId }),
        },
      })
  
      if (!existingThread) {
        return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
      }
  
      const updatedThread = await prisma.thread.update({
        where: { id: threadId },
        data: {
          ...(title && { title }),
          ...(metaData && { metaData }),
          ...(externalApiId !== undefined && { externalApiId })// Store external API ID
        }
      })
  
      return NextResponse.json(updatedThread, { status: 200 })
  
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Something went wrong' },
        { status: 500 }
      )
    }
  }

export async function DELETE(
    req : Request,
    { params }: { params: { id: string } }
){
   try{
     const threadId = Number(params.id)
     const identity = await getIdentity()

     const existing = await prisma.thread.findFirst({
        where : {
          id : threadId,
          ...(identity.ownerType === 'user' ? 
          { ownerUserId: identity.ownerUserId }
          : { ownerSessionId: identity.ownerSessionId }),
        }
     })
     if(!existing){
        return NextResponse.json({error : 'thread not exist'},{status : 404})
     }

     await prisma.thread.delete({
        where : { id : threadId}
     })

     return NextResponse.json({message : 'deleted'})
   } 
   catch (error: any) {
    console.error("DELETE ERROR:", error); // 👈 IMPORTANT
    return NextResponse.json(
      { error: error.message || "Internal error" },
      { status: 500 }
    );
  }
}