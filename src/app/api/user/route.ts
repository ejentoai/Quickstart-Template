import { NextResponse, NextRequest } from "next/server";
import { prisma } from '@/lib/prisma'

export async function POST(req:NextRequest){
  try{
    const body = await req.json();
    const { userId } = body

    if (!userId){
        return NextResponse.json(
            { error : 'user Id is required'},
            { status : 400}
        )
    }

    const user = await prisma.user.upsert({
      where: { userId },        
      update: {},               
      create: { userId },       
    });
    return NextResponse.json(
        user,
        { status : 201}
    )
  }
  catch(error : any){
    return NextResponse.json(
        { error : error?.message},
        { status : 500}
    )
  }
}

