import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Security Check: Ensure no admin exists yet
    // This prevents anyone from creating an admin account later
    const adminQuery = await adminDb.collection('users').where('role', '==', 'admin').limit(1).get();
    if (!adminQuery.empty) {
      return NextResponse.json({ error: 'Admin account already exists. Setup disabled.' }, { status: 403 });
    }

    // 2. Create Auth User
    const user = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    // 3. Create Firestore User Document with ADMIN role
    await adminDb.collection('users').doc(user.uid).set({
      name,
      email,
      role: 'admin',
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error creating admin:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
