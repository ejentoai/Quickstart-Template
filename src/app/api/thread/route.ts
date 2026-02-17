import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getIdentity } from "@/lib/getIdentity";
import { ownerType } from "@/generated/prisma/enums";
import { toast } from "sonner";

export async function POST(req: Request) {
    try {
      const body = await req.json()
      const { title, metadata } = body
  
      if (!title) {
        return NextResponse.json({ error: 'Title required' }, { status: 400 })
      }
  
      const identity = await getIdentity()
  
      const thread = await prisma.thread.create({
        data: {
          title,
          metaData: metadata || {},
          ownerType: identity.ownerType as ownerType,
          ownerUserId: identity.ownerUserId,
          ownerSessionId: identity.ownerSessionId,
        },
      })
  
      return NextResponse.json(thread)
    } catch (error) {
      return NextResponse.json(
        { error: 'unable to create thread' },
        { status: 400 }
      )
    }
}
  
export async function GET(){
    try{
      const identity = await getIdentity()

      const threads = await prisma.thread.findMany(
        {
            where : identity.ownerType === 'user' ?
            { ownerUserId : identity.ownerUserId }
            :
            { ownerSessionId : identity.ownerSessionId},
            orderBy : { updatedAt : 'desc'}
        }
      )
      return NextResponse.json(threads || [])
    }
    catch(error){
        console.error('Error in fetching all threads');
        // Instead of 400, return empty array to prevent frontend crash
        return NextResponse.json([], { status: 200 });
    }
}