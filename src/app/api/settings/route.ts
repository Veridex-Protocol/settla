import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/settings - Get current user's business settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user with their business
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { business: true }
    });

    if (!user?.business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const business = user.business;

    return NextResponse.json({
      id: business.id,
      name: business.name,
      email: business.email,
      walletAddress: business.walletAddress,
      taxId: business.taxId,
      website: business.website,
      supportEmail: business.supportEmail,
      address: business.address,
      city: business.city,
      state: business.state,
      zipCode: business.zipCode,
      country: business.country,
      defaultCurrency: business.defaultCurrency,
      timezone: business.timezone,
      logoUrl: business.logoUrl,
      kybStatus: business.kybStatus,
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PATCH /api/settings - Update current user's business settings
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Get user with their business
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { business: true }
    });

    if (!user?.business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Allowed fields to update
    const allowedFields = [
      'name',
      'walletAddress', // Allow updating payment receiving address
      'taxId',
      'website',
      'supportEmail',
      'address',
      'city',
      'state',
      'zipCode',
      'country',
      'defaultCurrency',
      'timezone',
      'logoUrl',
    ];

    // Filter only allowed fields
    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update business
    const updatedBusiness = await db.business.update({
      where: { id: user.business.id },
      data: updateData,
    });

    return NextResponse.json({
      id: updatedBusiness.id,
      name: updatedBusiness.name,
      email: updatedBusiness.email,
      walletAddress: updatedBusiness.walletAddress,
      taxId: updatedBusiness.taxId,
      website: updatedBusiness.website,
      supportEmail: updatedBusiness.supportEmail,
      address: updatedBusiness.address,
      city: updatedBusiness.city,
      state: updatedBusiness.state,
      zipCode: updatedBusiness.zipCode,
      country: updatedBusiness.country,
      defaultCurrency: updatedBusiness.defaultCurrency,
      timezone: updatedBusiness.timezone,
      logoUrl: updatedBusiness.logoUrl,
      kybStatus: updatedBusiness.kybStatus,
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
