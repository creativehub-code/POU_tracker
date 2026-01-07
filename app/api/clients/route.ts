import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name, targetAmount, fixedAmount } = body;

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Create Auth User
    const user = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    // 2. Create Firestore User Document
    await adminDb.collection('users').doc(user.uid).set({
      name,
      email,
      role: 'client',
      targetAmount: Number(targetAmount) || 0,
      fixedAmount: Number(fixedAmount) || 0,
      initialPassword: password, // Store for admin reference
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, userId: user.uid });
  } catch (error: any) {
    console.error('Error creating client:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('id');

    if (!clientId) {
      return NextResponse.json({ error: 'Missing client ID' }, { status: 400 });
    }

    // 1. Delete from Firebase Auth
    try {
      await adminAuth.deleteUser(clientId);
    } catch (authError: any) {
      // If user doesn't exist in auth, continue anyway to clean up Firestore
      console.warn('Auth deletion failed (user may not exist):', authError.message);
    }

    // 2. Unassign clients associated with this subadmin (if any)
    const assignedClientsSnapshot = await adminDb
      .collection('users')
      .where('assignedSubAdminId', '==', clientId)
      .get();

    if (!assignedClientsSnapshot.empty) {
      const unassignBatch = adminDb.batch();
      assignedClientsSnapshot.docs.forEach((doc) => {
        unassignBatch.update(doc.ref, { assignedSubAdminId: null });
      });
      await unassignBatch.commit();
    }

    // 3. Delete user document from Firestore
    await adminDb.collection('users').doc(clientId).delete();

    // 3. Delete all associated payments
    const paymentsSnapshot = await adminDb
      .collection('payments')
      .where('clientId', '==', clientId)
      .get();

    const batch = adminDb.batch();
    paymentsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting client:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
