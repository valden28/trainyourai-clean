"use client";
import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function ChatCore() {
  const supabase = createClientComponentClient();
  const [vault, setVault] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVault = async () => {
      const user_uid = localStorage.getItem("user_uid");
      if (!user_uid) {
        setError("User UID not found in localStorage.");
        return;
      }

      const { data, error } = await supabase
        .from("vaults_test")
        .select("*")
        .eq("user_uid", user_uid)
        .single();

      if (error) {
        setError("Supabase error: " + error.message);
      } else {
        setVault(data);
      }
    };

    fetchVault();
  }, []);

  return (
    <main style={{ padding: 40 }}>
      <h1>Chat Core Route is LIVE</h1>
      {vault ? (
        <pre style={{ background: "#eee", padding: "1rem" }}>
          {JSON.stringify(vault, null, 2)}
        </pre>
      ) : error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : (
        <p>Loading vault...</p>
      )}
    </main>
  );
}