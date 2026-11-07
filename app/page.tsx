"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SharkSymbol } from "@/components/brand/SharkLogo";

export default function HomePage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        router.replace("/dashboard");
      } else {
        router.replace("/auth/login");
      }
    };

    checkUser();
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-white text-center">
        <SharkSymbol size={56} className="mx-auto mb-4 animate-pulse" />
        <p className="text-ocean-400">Cargando Shark Life...</p>
      </div>
    </div>
  );
}