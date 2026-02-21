import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar`;

async function getHeaders() {
  const { data } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${data.session?.access_token}`,
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
  hangoutLink?: string;
  colorId?: string;
  organizer?: { displayName?: string; email?: string; self?: boolean };
  conferenceData?: {
    entryPoints?: Array<{ entryPointType: string; uri: string; label?: string }>;
    conferenceSolution?: { name?: { displayName?: string } };
  };
}

export function useGoogleCalendar() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [syncing, setSyncing] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const headers = await getHeaders();
      const res = await fetch(`${FUNCTION_URL}?action=status`, { headers });
      const data = await res.json();
      setConnected(data.connected);
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const connect = async () => {
    // Build the public-facing origin for the redirect URI
    let origin = window.location.origin;
    if (origin.includes('lovableproject.com')) {
      // Convert internal iframe domain to public domain
      // e.g. https://UUID.lovableproject.com -> https://id-preview--UUID.lovable.app
      const uuid = new URL(origin).hostname.replace('.lovableproject.com', '');
      origin = `https://id-preview--${uuid}.lovable.app`;
    }
    const redirectUri = `${origin}/auth/google-calendar/callback`;
    const headers = await getHeaders();
    const res = await fetch(`${FUNCTION_URL}?action=auth-url&redirect_uri=${encodeURIComponent(redirectUri)}`, { headers });
    const data = await res.json();
    if (data.url) {
      // Open in new tab to avoid iframe restrictions with Google OAuth
      window.open(data.url, '_blank');
    }
  };

  const disconnect = async () => {
    const headers = await getHeaders();
    await fetch(`${FUNCTION_URL}?action=disconnect`, { method: "POST", headers });
    setConnected(false);
    setEvents([]);
  };

  const fetchEvents = useCallback(async (timeMin?: string, timeMax?: string) => {
    if (!connected) return [];
    setSyncing(true);
    try {
      const headers = await getHeaders();
      const params = new URLSearchParams({ action: "list" });
      if (timeMin) params.set("timeMin", timeMin);
      if (timeMax) params.set("timeMax", timeMax);

      const res = await fetch(`${FUNCTION_URL}?${params}`, { headers });
      const data = await res.json();
      const items = data.items || [];
      setEvents(items);
      return items;
    } catch {
      return [];
    } finally {
      setSyncing(false);
    }
  }, [connected]);

  const createEvent = async (event: Record<string, unknown>) => {
    const headers = await getHeaders();
    const res = await fetch(`${FUNCTION_URL}?action=create`, {
      method: "POST",
      headers,
      body: JSON.stringify(event),
    });
    return res.json();
  };

  const updateEvent = async (eventId: string, event: Record<string, unknown>) => {
    const headers = await getHeaders();
    const res = await fetch(`${FUNCTION_URL}?action=update&eventId=${eventId}`, {
      method: "POST",
      headers,
      body: JSON.stringify(event),
    });
    return res.json();
  };

  const deleteEvent = async (eventId: string) => {
    const headers = await getHeaders();
    const res = await fetch(`${FUNCTION_URL}?action=delete&eventId=${eventId}`, {
      method: "POST",
      headers,
    });
    return res.json();
  };

  return {
    connected,
    loading,
    events,
    syncing,
    connect,
    disconnect,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    checkStatus,
  };
}
