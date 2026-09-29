import { NextResponse } from "next/server";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") {
    return new NextResponse(null, { status: 404 });
  }

  const directUrl = process.env.DIRECT_URL;
  if (!directUrl) {
    return NextResponse.json({ success: false }, { status: 503 });
  }

  let pool: Pool | undefined;
  try {
    const url = new URL(directUrl);
    url.searchParams.delete("sslmode");
    url.searchParams.delete("ssl");
    pool = new Pool({
      connectionString: url.toString(),
      ssl: { rejectUnauthorized: false },
      max: 1,
      connectionTimeoutMillis: 5000,
    });
    const result = await pool.query(
      'select to_regclass(\'public."BookingSlotHold"\')::text as table_name'
    );
    return NextResponse.json({
      success: result.rows[0]?.table_name === "BookingSlotHold",
    }, { status: result.rows[0]?.table_name === "BookingSlotHold" ? 200 : 503 });
  } catch {
    return NextResponse.json({ success: false }, { status: 503 });
  } finally {
    await pool?.end();
  }
}
