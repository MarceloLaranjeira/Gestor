import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import CampanhaLayout from "@/components/campanha/CampanhaLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, MapPin, Layers, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

declare global {
  interface Window { google: any; initGoogleMap: () => void; }
}

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string;

interface Calha {
  id: string; nome: string; municipios: number; votos_validos: number;
  percentual_cristaos: number; potencial_votos: number; regiao: string;
  latitude: number | null; longitude: number | null;
}
interface Local {
  id: string; nome: string; endereco: string; latitude: number;
  longitude: number; tipo: string; descricao: string;
}

const getColor = (pct: number) => {
  if (pct >= 40) return "#1d4ed8";
  if (pct >= 25) return "#7c3aed";
  if (pct >= 10) return "#0891b2";
  return "#dc2626";
};

const APOIO_LABELS = [
  { label: "Alto Potencial de Mandato", color: "#1d4ed8", min: 40 },
  { label: "Potencial Consolidado",     color: "#7c3aed", min: 25 },
  { label: "Em Desenvolvimento",        color: "#0891b2", min: 10 },
  { label: "Área Prioritária p/ Ação",  color: "#dc2626", min: 0  },
];

const TIPOS = [
  { value: "ponto_de_apoio", label: "Ponto de Apoio Parlamentar", icon: "🏠" },
  { value: "comite",         label: "Comitê Político",            icon: "🏢" },
  { value: "lideranca",      label: "Liderança Comunitária",      icon: "👤" },
  { value: "evento",         label: "Local de Evento do Mandato", icon: "📍" },
  { value: "outro",          label: "Ponto Estratégico",          icon: "📌" },
];
const tipoMap = Object.fromEntries(TIPOS.map(t => [t.value, t]));
const fmtNum = (n: number) => n.toLocaleString("pt-BR");

const CampanhaMapa = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [calhas, setCalhas] = useState<Calha[]>([]);
  const [locais, setLocais] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [mapType, setMapType] = useState<"satellite" | "roadmap">("satellite");
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<any[]>([]);
  const circlesRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const saveLocalRef = useRef<(nome: string, tipo: string, descricao: string, lat: number, lng: number) => Promise<void>>();

  const refreshLocais = async () => {
    const { data } = await supabase.from("campanha_locais").select("*").order("created_at", { ascending: false });
    setLocais((data as Local[]) || []);
  };

  useEffect(() => {
    const load = async () => {
      const [c, l] = await Promise.all([
        supabase.from("campanha_calhas").select("*").order("nome"),
        supabase.from("campanha_locais").select("*").order("created_at", { ascending: false }),
      ]);
      setCalhas((c.data as Calha[]) || []);
      setLocais((l.data as Local[]) || []);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node))
        setSearchResults([]);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const saveLocalFn = useCallback(async (nome: string, tipo: string, descricao: string, lat: number, lng: number) => {
    if (!user) return;
    let endereco = "";
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      endereco = data.display_name || "";
    } catch {}
    const { error } = await supabase.from("campanha_locais").insert({ nome, endereco, latitude: lat, longitude: lng, tipo, descricao, user_id: user.user_id });
    if (error) { toast.error("Erro ao salvar local"); return; }
    toast.success("Local adicionado ao mapa!");
    refreshLocais();
  }, [user]);

  useEffect(() => { saveLocalRef.current = saveLocalFn; }, [saveLocalFn]);

  // Load Google Maps
  useEffect(() => {
    if (window.google?.maps) { initMap(); return; }
    if (!GOOGLE_MAPS_KEY) return;

    window.initGoogleMap = initMap;
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&callback=initGoogleMap&v=beta&map_ids=DEMO_MAP_ID`;
    script.async = true;
    document.head.appendChild(script);
    return () => { delete window.initGoogleMap; };
  }, []);

  const initMap = () => {
    if (!containerRef.current || mapRef.current) return;
    const g = window.google.maps;

    const map = new g.Map(containerRef.current, {
      center: { lat: -3.1, lng: -60.0 },
      zoom: 6,
      mapTypeId: "satellite",
      tilt: 45,          // 3D perspective
      heading: 0,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      rotateControl: true,
      mapTypeControlOptions: {
        style: g.MapTypeControlStyle.DROPDOWN_MENU,
        mapTypeIds: ["roadmap", "satellite", "hybrid", "terrain"],
      },
    });

    infoWindowRef.current = new g.InfoWindow();

    // Click to add local
    map.addListener("click", (e: any) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      const nome = window.prompt(`📍 Registrar ponto\nCoordenadas: ${lat.toFixed(5)}, ${lng.toFixed(5)}\n\nNome do ponto:`);
      if (!nome?.trim()) return;
      saveLocalRef.current?.(nome.trim(), "outro", "", lat, lng);
    });

    mapRef.current = map;
    setMapReady(true);
  };

  const toggleMapType = () => {
    if (!mapRef.current) return;
    const next = mapType === "satellite" ? "roadmap" : "satellite";
    mapRef.current.setMapTypeId(next === "satellite" ? "hybrid" : "roadmap");
    mapRef.current.setTilt(next === "satellite" ? 45 : 0);
    setMapType(next);
  };

  // Search
  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=br&limit=6`);
      const data = await res.json();
      setSearchResults(data);
      if (data.length === 0) toast.info("Nenhum resultado encontrado");
    } catch { toast.error("Erro ao buscar endereço"); }
    setSearching(false);
  };

  const goToResult = (r: any) => {
    if (!mapRef.current || !window.google) return;
    const lat = Number(r.lat), lng = Number(r.lon);
    mapRef.current.panTo({ lat, lng });
    mapRef.current.setZoom(14);
    setSearchResults([]);
    setSearchQuery("");
  };

  // Update markers
  useEffect(() => {
    if (!mapRef.current || !mapReady || !window.google) return;
    const g = window.google.maps;

    markersRef.current.forEach(m => m.setMap(null));
    circlesRef.current.forEach(c => c.setMap(null));
    markersRef.current = [];
    circlesRef.current = [];

    const calhasComCoord = calhas.filter(c => c.latitude != null && c.longitude != null);
    const maxVotos = Math.max(...calhasComCoord.map(c => c.potencial_votos ?? 0), 1);

    calhasComCoord.forEach(c => {
      const pct = Number(c.percentual_cristaos) || 0;
      const color = getColor(pct);
      const label = APOIO_LABELS.find(a => pct >= a.min) ?? APOIO_LABELS[3];
      const radius = 8000 + ((c.potencial_votos ?? 0) / maxVotos) * 40000;

      const circle = new g.Circle({
        map: mapRef.current,
        center: { lat: Number(c.latitude), lng: Number(c.longitude) },
        radius,
        fillColor: color,
        fillOpacity: 0.4,
        strokeColor: color,
        strokeOpacity: 0.9,
        strokeWeight: 2,
        clickable: true,
      });

      circle.addListener("click", () => {
        infoWindowRef.current.setContent(`
          <div style="min-width:200px;font-family:sans-serif;padding:4px">
            <p style="font-weight:700;font-size:14px;margin:0 0 6px;color:${color}">${c.nome}</p>
            <p style="margin:3px 0;font-size:12px"><span style="color:#6b7280">Região:</span> <b>${c.regiao || "—"}</b></p>
            <p style="margin:3px 0;font-size:12px"><span style="color:#6b7280">Municípios:</span> <b>${c.municipios}</b></p>
            <p style="margin:3px 0;font-size:12px"><span style="color:#6b7280">Votos Válidos:</span> <b>${fmtNum(c.votos_validos)}</b></p>
            <p style="margin:3px 0;font-size:12px"><span style="color:#6b7280">Potencial:</span> <b>${fmtNum(c.potencial_votos)}</b></p>
            <p style="margin:6px 0 0;font-size:11px;padding:4px 8px;border-radius:4px;background:${color}22;color:${color};font-weight:600;border-left:3px solid ${color}">${label.label}</p>
          </div>
        `);
        infoWindowRef.current.setPosition({ lat: Number(c.latitude), lng: Number(c.longitude) });
        infoWindowRef.current.open(mapRef.current);
      });

      circlesRef.current.push(circle);
    });

    locais.forEach(l => {
      const tipo = tipoMap[l.tipo] ?? { icon: "📌", label: "Ponto Estratégico" };
      const marker = new g.Marker({
        map: mapRef.current,
        position: { lat: Number(l.latitude), lng: Number(l.longitude) },
        title: l.nome,
        label: { text: tipo.icon, fontSize: "20px" },
        icon: {
          path: g.SymbolPath.CIRCLE,
          scale: 14,
          fillColor: "#1d4ed8",
          fillOpacity: 0.9,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
      });

      marker.addListener("click", () => {
        infoWindowRef.current.setContent(`
          <div style="min-width:180px;font-family:sans-serif;padding:4px">
            <p style="font-weight:700;font-size:13px;margin:0 0 4px">${tipo.icon} ${l.nome}</p>
            <p style="font-size:11px;color:#6b7280;margin:0 0 2px">${tipo.label}</p>
            ${l.endereco ? `<p style="font-size:11px;color:#4b5563;margin:3px 0">📍 ${l.endereco}</p>` : ""}
            ${l.descricao ? `<p style="font-size:11px;color:#6b7280;margin:3px 0;font-style:italic">${l.descricao}</p>` : ""}
          </div>
        `);
        infoWindowRef.current.open(mapRef.current, marker);
      });

      markersRef.current.push(marker);
    });

    // Fit bounds
    const allPoints = [
      ...calhasComCoord.map(c => ({ lat: Number(c.latitude), lng: Number(c.longitude) })),
      ...locais.map(l => ({ lat: Number(l.latitude), lng: Number(l.longitude) })),
    ];
    if (allPoints.length > 0) {
      const bounds = new g.LatLngBounds();
      allPoints.forEach(p => bounds.extend(p));
      mapRef.current.fitBounds(bounds, 50);
    }
  }, [calhas, locais, mapReady]);

  // Focus from query params
  useEffect(() => {
    if (!mapRef.current || !mapReady || loading || !window.google) return;
    const lat = searchParams.get("lat"), lng = searchParams.get("lng");
    if (lat && lng) {
      const latNum = Number(lat), lngNum = Number(lng);
      if (!isNaN(latNum) && !isNaN(lngNum)) {
        mapRef.current.panTo({ lat: latNum, lng: lngNum });
        mapRef.current.setZoom(16);
      }
    }
  }, [searchParams, loading, mapReady]);

  const calhasComCoord = calhas.filter(c => c.latitude !== null && c.longitude !== null);
  const calhasSemCoord = calhas.filter(c => c.latitude === null || c.longitude === null);
  const totalVotosValidos = calhas.reduce((s, c) => s + (c.votos_validos ?? 0), 0);
  const totalPotencial = calhas.reduce((s, c) => s + (c.potencial_votos ?? 0), 0);

  return (
    <CampanhaLayout title="Mapa Estratégico do Mandato">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 space-y-3">
          <div ref={searchBoxRef} className="relative flex gap-2">
            <div className="relative flex-1">
              <Input
                placeholder="Buscar município, endereço ou local..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                className="pr-10"
              />
              <button onClick={handleSearch} disabled={searching} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50">
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </button>
            </div>
            <Button size="icon" variant="outline" onClick={toggleMapType} title={mapType === "satellite" ? "Alternar para mapa padrão" : "Alternar para satélite 3D"}>
              <Layers className="w-4 h-4" />
            </Button>
            {searchResults.length > 0 && (
              <Card className="absolute top-full left-0 right-0 z-[2000] mt-1 shadow-xl">
                <CardContent className="p-0 divide-y max-h-52 overflow-y-auto">
                  {searchResults.map((r: any, i: number) => (
                    <button key={i} className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-2" onClick={() => goToResult(r)}>
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate text-xs">{r.display_name}</span>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          <Card className="overflow-hidden border shadow-md">
            <CardContent className="p-0 relative">
              {(loading || (!mapReady)) && (
                <div className="h-[560px] flex flex-col items-center justify-center bg-muted/30 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground">Carregando Google Maps 3D…</p>
                </div>
              )}
              <div ref={containerRef} className="h-[560px] lg:h-[640px] rounded-lg" style={{ display: mapReady ? "block" : "none" }} />
              {mapReady && (
                <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1.5">
                  <span>🗺</span><span>Google Maps 3D · Clique para registrar ponto</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-bold text-foreground uppercase tracking-wide">Resumo Territorial</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-primary/8 border border-primary/20 p-2.5 text-center">
                  <p className="text-lg font-bold text-primary">{calhasComCoord.length}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">Regiões mapeadas</p>
                </div>
                <div className="rounded-lg bg-muted/40 border border-border p-2.5 text-center">
                  <p className="text-lg font-bold text-foreground">{locais.length}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">Pontos cadastrados</p>
                </div>
                <div className="rounded-lg bg-muted/40 border border-border p-2.5 text-center col-span-2">
                  <p className="text-base font-bold text-foreground">{fmtNum(totalVotosValidos)}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">Votos válidos</p>
                </div>
                <div className="rounded-lg bg-secondary/8 border border-secondary/20 p-2.5 text-center col-span-2">
                  <p className="text-base font-bold" style={{ color: "#7c3aed" }}>{fmtNum(totalPotencial)}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">Potencial total do mandato</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-bold text-foreground uppercase tracking-wide">Legenda Estratégica</p>
              <div className="space-y-1">
                {APOIO_LABELS.map(l => (
                  <div key={l.label} className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: l.color, opacity: 0.85 }} />
                    <span className="text-[11px] text-foreground leading-tight">{l.label}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border/50 pt-2.5 space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Pontos Estratégicos</p>
                {TIPOS.map(t => {
                  const count = locais.filter(l => l.tipo === t.value).length;
                  return (
                    <div key={t.value} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{t.icon}</span>
                        <span className="text-[11px] text-foreground leading-tight">{t.label}</span>
                      </div>
                      {count > 0 && <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">{count}</Badge>}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {calhasSemCoord.length > 0 && (
            <Card className="border-warning/40 bg-warning/5">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
                  <p className="text-xs font-semibold text-warning">{calhasSemCoord.length} região(s) sem coordenadas</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {calhasSemCoord.map(c => (
                    <Badge key={c.id} variant="outline" className="text-[10px] border-warning/50 text-warning">{c.nome}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </CampanhaLayout>
  );
};

export default CampanhaMapa;
