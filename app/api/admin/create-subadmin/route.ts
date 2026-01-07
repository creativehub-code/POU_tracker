import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Verify requester is admin in Firestore
    const requesterSnap = await adminDb.collection("users").doc(decodedToken.uid).get();
    if (!requesterSnap.exists || requesterSnap.data()?.role !== "admin") {
       return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    const { name, email, password } = await req.json();

    const user = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    await adminDb.collection("users").doc(user.uid).set({
      name,
      email,
      role: "subadmin",
      initialPassword: password,
      createdBy: decodedToken.uid,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, uid: user.uid });
  } catch (error: any) {
    console.error("Error creating subadmin:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
}
