import admin from "firebase-admin";

if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_ADMIN_KEY;

  if (!privateKey) {
    console.error("❌ FIREBASE_ADMIN_KEY is missing in .env.local");
    throw new Error("Missing FIREBASE_ADMIN_KEY env variable");
  }

  try {
    // Attempt to handle common formatting issues
    let formatted = privateKey;

    // 1. Fix double braces (e.g. {{...}}) which happens when copying from some sources
    if (formatted.startsWith("{{")) {
      console.log("⚠️ Detected double braces, fixing...");
      formatted = formatted.substring(1);
      if (formatted.endsWith("}}")) {
        formatted = formatted.substring(0, formatted.length - 1);
      }
    }

    // 2. Fix escaped newlines (common in .env files)
    if (formatted.includes("\\n")) {
      formatted = formatted.replace(/\\n/g, "\n");
    }

    // 3. Try parsing
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(formatted);
    } catch (e1) {
      // Only try the raw one if the formatted on failed, or vice versa?
      // Actually, usually raw works if it's perfect, but let's trust our cleaning.
      // Backup: try parsing original if formatted failed?
      console.log(
        "⚠️ Formatted parse failed (" + e1.message + "), trying raw..."
      );
      serviceAccount = JSON.parse(privateKey);
    }

    if (!serviceAccount.project_id) {
      console.warn("⚠️ Warning: project_id missing in service account JSON");
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("✅ Firebase Admin Initialized");
  } catch (error) {
    console.error("❌ Firebase Admin Init Error:", error.message);
    throw error; // Re-throw to pause execution and show this error in terminal
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
