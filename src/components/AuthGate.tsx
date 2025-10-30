import { useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export function useRequireAnon(callback: () => void) {
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) callback();
    });
  }, [callback]);
}
