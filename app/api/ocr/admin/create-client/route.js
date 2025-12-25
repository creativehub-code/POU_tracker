import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";

export async function POST(req) {
  const { name, email, password, targetAmount } = await req.json();

  try {
    const user = await adminAuth.createUser({
      email,
      password,
    });

    await adminDb.collection("users").doc(user.uid).set({
      name,
      email,
      role: "client",
      targetAmount,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
}
