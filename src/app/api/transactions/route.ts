import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/api-auth";

export async function GET(req: Request) {
    try {
        const authUser = await getAuthenticatedUser();

        if (!authUser) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const transactions = await db.transaction.findMany({
            where: {
                businessId: authUser.businessId,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 50,
            include: {
                invoice: { select: { invoiceNumber: true } },
                paymentLink: { select: { shortCode: true } },
            },
        });

        return NextResponse.json(transactions);
    } catch (error) {
        console.error("[TRANSACTIONS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
