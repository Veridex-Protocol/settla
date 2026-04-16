import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/api-auth";

export async function GET() {
    try {
        const authUser = await getAuthenticatedUser();

        if (!authUser) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Fetch business data
        const business = await db.business.findUnique({
            where: { id: authUser.businessId },
            include: {
                invoices: { take: 1 },
                paymentLinks: { take: 1 },
                transactions: {
                    where: {
                        type: "inflow",
                        status: { in: ["confirmed", "settled"] }
                    },
                    take: 1
                },
                teamMembers: { take: 2 },
            },
        });

        if (!business) {
            return new NextResponse("Business not found", { status: 404 });
        }

        // Build checklist items based on actual data
        const items = [
            {
                id: "profile",
                label: "Set up business profile",
                description: "Add your business details",
                href: "/dashboard/settings",
                completed: Boolean(business.name && business.name !== "My Business"),
            },
            {
                id: "invoice",
                label: "Create first invoice",
                description: "Send an invoice to a customer",
                href: "/dashboard/invoices/new",
                completed: business.invoices.length > 0,
            },
            {
                id: "payment-link",
                label: "Create payment link",
                description: "Generate a reusable payment link",
                href: "/dashboard/payments/new",
                completed: business.paymentLinks.length > 0,
            },
            {
                id: "first-payment",
                label: "Receive first payment",
                description: "Get paid by a customer",
                completed: business.transactions.length > 0,
            },
            {
                id: "team",
                label: "Invite team member",
                description: "Collaborate with your team",
                href: "/dashboard/team",
                completed: business.teamMembers.length > 1, // More than just the owner
            },
        ];

        const completedCount = items.filter((item) => item.completed).length;
        const progress = (completedCount / items.length) * 100;

        return NextResponse.json({
            items,
            completedCount,
            totalCount: items.length,
            progress,
            allCompleted: completedCount === items.length,
        });
    } catch (error) {
        console.error("[ONBOARDING_CHECKLIST_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
