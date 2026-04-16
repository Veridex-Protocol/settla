import { NextRequest, NextResponse } from "next/server";
import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  prepareBadgeCardData,
  BADGE_DEFINITIONS,
  TIER_CONFIGS,
  generateQRCode,
  generateMerchantBackground,
  generateAIBackgroundImage,
} from "@/lib/services/badge-card-service";

// export const runtime = "edge"; // utilizing functions that require nodejs runtime

// GET - Generate badge card image
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const achievementType = searchParams.get("type");
    const format = searchParams.get("format") || "image"; // image or json

    if (!achievementType) {
      return NextResponse.json(
        { error: "Achievement type is required" },
        { status: 400 }
      );
    }

    const badge = BADGE_DEFINITIONS[achievementType];
    if (!badge) {
      return NextResponse.json(
        { error: "Invalid achievement type" },
        { status: 400 }
      );
    }

    // Check if this is a tier badge (always allowed for authenticated users)
    const isTierBadge = achievementType.startsWith("TIER_");

    // Get session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user and achievement data
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        business: true,
        achievements: isTierBadge ? undefined : {
          where: { type: achievementType as any },
          take: 1,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // For regular achievements, check if earned. Tier badges are always allowed.
    if (!isTierBadge) {
      const achievement = user.achievements?.[0];
      if (!achievement) {
        return NextResponse.json(
          { error: "Achievement not earned" },
          { status: 404 }
        );
      }
    }

    const merchantName = user.business?.name || user.name || "Sera Merchant";
    // For tier badges, use current date. For achievements, use earned date.
    const earnedAt = isTierBadge
      ? new Date()
      : (user.achievements?.[0]?.earnedAt || new Date());
    const tierConfig = TIER_CONFIGS[badge.tier];

    // Generate QR code
    const platformUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://sett.la"}/verify/${user.id}/${achievementType}`;
    const qrCode = await generateQRCode(platformUrl);
    
    // Generate unique background - try AI first, fallback to procedural SVG
    let backgroundImage: string;
    
    // Try AI-generated background
    const aiBackground = await generateAIBackgroundImage(
      merchantName,
      user.id,
      achievementType,
      badge.tier,
      badge.accentColor
    );
    
    if (aiBackground) {
      backgroundImage = aiBackground;
    } else {
      // Fallback to procedural SVG background
      backgroundImage = generateMerchantBackground(
        user.id,
        merchantName,
        badge.accentColor,
        badge.gradientColors
      );
    }

    if (format === "json") {
      const cardData = await prepareBadgeCardData(
        merchantName,
        user.id,
        achievementType,
        earnedAt
      );
      return NextResponse.json(cardData);
    }

    // Generate the badge card image using next/og ImageResponse
    // Note: Satori (used by next/og) requires explicit flex properties
    return new ImageResponse(
      (
        <div
          style={{
            width: 600,
            height: 400,
            display: "flex",
            flexDirection: "column",
            fontFamily: "Inter, system-ui, sans-serif",
            padding: 24,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Unique AI/procedural background with blur */}
          <img
            src={backgroundImage}
            width={660}
            height={460}
            style={{
              position: "absolute",
              top: -30,
              left: -30,
              width: 660,
              height: 460,
              filter: "blur(8px)",
              transform: "scale(1.1)",
            }}
          />
          
          {/* Dark overlay for better text readability */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 600,
              height: 400,
              background: "linear-gradient(135deg, rgba(10,10,10,0.7) 0%, rgba(26,26,46,0.6) 50%, rgba(22,33,62,0.7) 100%)",
            }}
          />
          
          {/* Content overlay */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              height: "100%",
              position: "relative",
            }}
          >
            {/* Header row */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
                marginBottom: 20,
              }}
            >
              {/* Tier badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 24, marginRight: 8 }}>{tierConfig.badge}</span>
              <span
                style={{
                  color: "#a1a1aa",
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: 2,
                }}
              >
                {badge.tier} Achievement
              </span>
            </div>
            {/* Sera logo */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: "linear-gradient(135deg, #10b981, #06b6d4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 6,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L22 12L12 22L2 12L12 2Z" fill="white" />
                </svg>
              </div>
              <span
                style={{
                  color: "#ffffff",
                  fontSize: 16,
                  fontWeight: 600,
                }}
              >
                Settla
              </span>
            </div>
          </div>

          {/* Main content row */}
          <div
            style={{
              display: "flex",
              flex: 1,
              alignItems: "center",
              width: "100%",
            }}
          >
            {/* Badge icon */}
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: 24,
                background: `linear-gradient(135deg, ${badge.gradientColors[0]}, ${badge.gradientColors[1]})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 56,
                marginRight: 24,
                flexShrink: 0,
              }}
            >
              {badge.icon}
            </div>

            {/* Badge info */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  color: "#ffffff",
                  fontSize: 28,
                  fontWeight: 700,
                  lineHeight: 1.2,
                }}
              >
                {badge.name}
              </div>
              <div
                style={{
                  color: badge.accentColor,
                  fontSize: 14,
                  marginTop: 8,
                  lineHeight: 1.4,
                }}
              >
                {badge.description}
              </div>
            </div>

            {/* QR Code */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                marginLeft: 24,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 100,
                  height: 100,
                  background: "#ffffff",
                  borderRadius: 12,
                  padding: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                  border: "2px solid #10b981",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCode}
                  width={84}
                  height={84}
                  style={{ 
                    borderRadius: 4,
                    display: "flex",
                  }}
                />
              </div>
              <span
                style={{
                  color: "#10b981",
                  fontSize: 10,
                  marginTop: 8,
                  fontWeight: 500,
                }}
              >
                Scan to verify
              </span>
            </div>
          </div>

          {/* Footer row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              width: "100%",
              marginTop: 20,
              paddingTop: 16,
              borderTop: "1px solid #27272a",
            }}
          >
            {/* Awarded to */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  color: "#71717a",
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Awarded to
              </span>
              <span
                style={{
                  color: "#ffffff",
                  fontSize: 18,
                  fontWeight: 600,
                  marginTop: 4,
                }}
              >
                {merchantName}
              </span>
            </div>
            {/* Earned on */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
              }}
            >
              <span
                style={{
                  color: "#71717a",
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Earned on
              </span>
              <span
                style={{
                  color: "#a1a1aa",
                  fontSize: 14,
                  marginTop: 4,
                }}
              >
                {new Date(earnedAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
          </div>

          {/* Corner accents */}
          <div
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              width: 40,
              height: 40,
              borderTop: `2px solid ${badge.accentColor}`,
              borderLeft: `2px solid ${badge.accentColor}`,
              borderTopLeftRadius: 8,
              opacity: 0.7,
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 10,
              right: 10,
              width: 40,
              height: 40,
              borderBottom: `2px solid ${badge.accentColor}`,
              borderRight: `2px solid ${badge.accentColor}`,
              borderBottomRightRadius: 8,
              opacity: 0.7,
            }}
          />
        </div>
      ),
      {
        width: 600,
        height: 400,
      }
    );
  } catch (error) {
    console.error("Badge card generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate badge card" },
      { status: 500 }
    );
  }
}
