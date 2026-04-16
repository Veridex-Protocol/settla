import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/api-auth";

// This route initiates a transaction request that needs to be signed client-side
export async function POST(req: Request) {
    try {
        const authUser = await getAuthenticatedUser();

        if (!authUser) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const { toAddress, amount, currency, note } = body;

        // Validate inputs
        if (!toAddress || !amount || !currency) {
            return NextResponse.json({ 
                error: 'Missing required fields: toAddress, amount, currency' 
            }, { status: 400 });
        }

        // Validate address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(toAddress)) {
            return NextResponse.json({ error: 'Invalid recipient address' }, { status: 400 });
        }

        // Validate amount
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }

        // Create a pending outflow transaction record
        const transaction = await db.transaction.create({
            data: {
                businessId: authUser.businessId,
                type: 'outflow',
                amount: numAmount,
                currency: currency,
                status: 'pending',
                payerAddress: toAddress,
                metadata: {
                    note: note || null,
                    initiatedAt: new Date().toISOString(),
                },
            },
        });

        return NextResponse.json({
            transactionId: transaction.id,
            status: 'pending',
            message: 'Transaction created. Please sign with your wallet to complete.',
            transaction: {
                id: transaction.id,
                type: 'outflow',
                amount: numAmount,
                currency,
                toAddress,
                status: 'pending',
            },
        });
    } catch (error) {
        console.error("[WALLET_SEND_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// Update transaction status after signing
export async function PATCH(req: Request) {
    try {
        const authUser = await getAuthenticatedUser();

        if (!authUser) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const { transactionId, txHash, status } = body;

        if (!transactionId) {
            return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 });
        }

        // Find and update the transaction
        const transaction = await db.transaction.findFirst({
            where: {
                id: transactionId,
                businessId: authUser.businessId,
            },
        });

        if (!transaction) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
        }

        // Update the transaction
        const updated = await db.transaction.update({
            where: { id: transactionId },
            data: {
                txHash: txHash || transaction.txHash,
                status: status || transaction.status,
                updatedAt: new Date(),
            },
        });

        return NextResponse.json({
            transaction: updated,
            message: status === 'settled' 
                ? 'Transaction completed successfully' 
                : 'Transaction updated',
        });
    } catch (error) {
        console.error("[WALLET_SEND_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
