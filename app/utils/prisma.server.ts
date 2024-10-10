   // app/utils/prisma.server.ts
   import { PrismaClient } from "@prisma/client";

   let prisma: PrismaClient;

   declare global {
     var __db: PrismaClient | undefined;
   }



export { prisma };

// Function to store subscribed user
export async function subscribeUser(email: string) {
  try {
    const user = await prisma.user.create({
      data: { email, name: "Default Name" }, // Added 'name' property
    });
    return user;
  } catch (error: any) { // Explicitly type error as 'any'
    throw new Error(`Failed to subscribe user: ${error.message}`);
  }
}