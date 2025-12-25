"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function HomePage() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (userData?.role === "admin") {
      router.replace("/admin");
    } else {
      router.replace("/client");
    }
  }, [user, userData, loading, router]);

  return null;
}
