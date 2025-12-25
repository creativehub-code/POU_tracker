import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";

export async function login(email, password) {
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error("Firebase Auth Error:", error.code, error.message);
    throw error;
  }
}

