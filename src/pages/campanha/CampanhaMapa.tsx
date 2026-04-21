import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import CampanhaLayout from "@/components/campanha/CampanhaLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search, Loader2, MapPin, Layers, Eye, EyeOff,
  Users, Vote, Building2, AlertTriangle, Map,
} from "lucide-react";
import { toast } from "sonner";

// ── Apple MapKit JS global type declaration
declare global {
  interface Window {
    mapkit: any;
  }
}

interface Calha {
  id: string;
  nome: string;
  municipios: number;
  votos_validos: number;
  percentual_cristaos: number;
  potencial_votos: number;
  regiao: string;
  latitude: number | null;
  longitude: number | null;
}

interface Local {
  id: string;
  nome: string;
  endereco: string;
  latitude: number;
  longitude: number;
  tipo: string;
  descricao: string;
}

// ── Cor por índice de apoio
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

const tipoMap = Object.fromEntries(TIPOS.map((t) => [t.value, t]));
const fmtNum = (n: number) => n.toLocaleString("pt-BR");

// ── Token Apple MapKit JS — configure via VITE_APPLE_MAPS_TOKEN no .env
// Para obter um token: https://developer.apple.com/maps/web/
const APPLE_MAPS_TOKEN = import.meta.env.VITE_APPLE_MAPS_TOKEN as string | undefined;

const CampanhaMapa = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [calhas, setCalhas] = useState<Calha[]>([]);
  const [locais, setLocais] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [mapType, setMapType] = useState<"hybrid" | "standard">("hybrid");
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const annotationsRef = useRef<any[]>([]);
  const saveLocalRef = useRef<(nome: string, tipo: string, descricao: string, lat: number, lng: number) => Promise<void>>();

  const refreshLocais = async () => {
    const { data } = await supabase
      .from("campanha_locais")
      .select("*")
      .order("created_at", { ascending: false });
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

  // Close search dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchResults([]);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const saveLocalFn = useCallback(
    async (nome: string, tipo: string, descricao: string, lat: number, lng: number) => {
      if (!user) return;
      let endereco = "";
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        const data = await res.json();
        endereco = data.display_name || "";
      } catch {}

      const { error } = await supabase.from("campanha_locais").insert({
        nome,
        endereco,
        latitude: lat,
        longitude: lng,
        tipo,
        descricao,
        user_id: user.user_id,
      });
      if (error) {
        toast.error("Erro ao salvar local");
        return;
      }
      toast.success("Local adicionado ao mapa!");
      refreshLocais();
    },
    [user]
  );

  useEffect(() => {
    saveLocalRef.current = saveLocalFn;
  }, [saveLocalFn]);

  // ── Load Apple MapKit JS
  useEffect(() => {
    if (window.mapkit) {
      initMap();
      return;
    }

    if (!APPLE_MAPS_TOKEN) {
      setMapError(
        "Configure VITE_APPLE_MAPS_TOKEN no arquivo .env para ativar o mapa Apple Maps 3D.\n" +
        "Obtenha um token em developer.apple.com/maps/web/"
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js";
    script.crossOrigin = "anonymous";
    script.onload = () => initMap();
    script.onerror = () => setMapError("Falha ao carregar Apple MapKit JS.");
    document.head.appendChild(script);

    return () => {
      if (mapRef.current) {
        try { mapRef.current.destroy?.(); } catch {}
        mapRef.current = null;
      }
    };
  }, []);

  const initMap = () => {
    if (!containerRef.current || mapRef.current) return;

    const mk = window.mapkit;
    if (!mk) return;

    mk.init({
      authorizationCallback: (done: (token: string) => void) => {
        done(APPLE_MAPS_TOKEN!);
      },
    });

    const map = new mk.Map(containerRef.current, {
      center: new mk.Coordinate(-3.1, -60.0),
      cameraDistance: 2_000_000,
      mapType: mk.Map.MapTypes.Hybrid,
      showsBuildings: true,
      showsPointsOfInterest: true,
      showsCompass: mk.FeatureVisibility.Adaptive,
      showsScale: mk.FeatureVisibility.Adaptive,
      showsZoomControl: true,
    });

    // Click to add local
    map.addEventListener("single-tap", (event: any) => {
      const coord = map.convertPointOnPageToCoordinate(
        new DOMPoint(event.domEvent.pageX, event.domEvent.pageY)
      );
      if (!coord) return;
      showAddDialog(coord.latitude, coord.longitude);
    });

    mapRef.current = map;
    setMapReady(true);
  };

  const showAddDialog = (lat: number, lng: number) => {
    const tipo = TIPOS[0].value;
    const nome = window.prompt(`📍 Registrar ponto em ${lat.toFixed(5)}, ${lng.toFixed(5)}\n\nNome do ponto:`);
    if (!nome?.trim()) return;
    saveLocalRef.current?.(nome.trim(), tipo, "", lat, lng);
  };

  // Toggle map type
  const toggleMapStyle = () => {
    if (!mapRef.current || !window.mapkit) return;
    const mk = window.mapkit;
    const next = mapType === "hybrid" ? "standard" : "hybrid";
    mapRef.current.mapType =
      next === "hybrid" ? mk.Map.MapTypes.Hybrid : mk.Map.MapTypes.Standard;
    setMapType(next);
  };

  // Search address via Nominatim
  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=br&limit=6`
      );
      const data = await res.json();
      setSearchResults(data);
      if (data.length === 0) toast.info("Nenhum resultado encontrado");
    } catch {
      toast.error("Erro ao buscar endereço");
    }
    setSearching(false);
  };

  const goToResult = (r: any) => {
    if (!mapRef.current || !window.mapkit) return;
    const mk = window.mapkit;
    const lat = Number(r.lat);
    const lng = Number(r.lon);
    mapRef.current.setRegionAnimated(
      new mk.CoordinateRegion(
        new mk.Coordinate(lat, lng),
        new mk.CoordinateSpan(0.05, 0.05)
      )
    );
    setSearchResults([]);
    setSearchQuery("");
  };

  // Update annotations when data changes
  useEffect(() => {
    if (!mapRef.current || !mapReady || !window.mapkit) return;
    const mk = window.mapkit;

    // Remove old annotations
    if (annotationsRef.current.length > 0) {
      mapRef.current.removeAnnotations(annotationsRef.current);
      annotationsRef.current = [];
    }

    const newAnnotations: any[] = [];

    // Calha annotations
    calhas
      .filter((c) => c.latitude != null && c.longitude != null)
      .forEach((c) => {
        const pct = Number(c.percentual_cristaos) || 0;
        const label = APOIO_LABELS.find((a) => pct >= a.min) ?? APOIO_LABELS[3];
        const color = getColor(pct).replace("#", "");

        const annotation = new mk.MarkerAnnotation(
          new mk.Coordinate(Number(c.latitude), Number(c.longitude)),
          {
            color: getColor(pct),
            title: c.nome,
            subtitle: `${label.label} · ${fmtNum(c.potencial_votos)} votos`,
            glyphText: "📍",
          }
        );
        newAnnotations.push(annotation);
      });

    // Local annotations
    locais.forEach((l) => {
      const tipo = tipoMap[l.tipo] ?? { icon: "📌", label: "Ponto Estratégico" };
      const annotation = new mk.MarkerAnnotation(
        new mk.Coordinate(Number(l.latitude), Number(l.longitude)),
        {
          title: l.nome,
          subtitle: tipo.label,
          glyphText: tipo.icon,
          color: "#1d4ed8",
        }
      );
      newAnnotations.push(annotation);
    });

    if (newAnnotations.length > 0) {
      mapRef.current.addAnnotations(newAnnotations);
      annotationsRef.current = newAnnotations;

      // Fit to show all annotations
      try {
        mapRef.current.showItems(newAnnotations, { animate: true, padding: new mk.Padding(50) });
      } catch {}
    }
  }, [calhas, locais, mapReady]);

  // Focus on location from query params
  useEffect(() => {
    if (!mapRef.current || !mapReady || loading || !window.mapkit) return;
    const mk = window.mapkit;
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    if (lat && lng) {
      const latNum = Number(lat);
      const lngNum = Number(lng);
      if (!isNaN(latNum) && !isNaN(lngNum)) {
        mapRef.current.setRegionAnimated(
          new mk.CoordinateRegion(
            new mk.Coordinate(latNum, lngNum),
            new mk.CoordinateSpan(0.01, 0.01)
          )
        );
      }
    }
  }, [searchParams, loading, mapReady]);

  // Derived stats
  const calhasComCoord = calhas.filter((c) => c.latitude !== null && c.longitude !== null);
  const calhasSemCoord = calhas.filter((c) => c.latitude === null || c.longitude === null);
  const totalVotosValidos = calhas.reduce((s, c) => s + (c.votos_validos ?? 0), 0);
  const totalPotencial = calhas.reduce((s, c) => s + (c.potencial_votos ?? 0), 0);

  return (
    <CampanhaLayout title="Mapa Estratégico do Mandato">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* ── Coluna principal: mapa ── */}
        <div className="lg:col-span-3 space-y-3">
          {/* Search bar */}
          <div ref={searchBoxRef} className="relative flex gap-2">
            <div className="relative flex-1">
              <Input
                placeholder="Buscar município, endereço ou local estratégico..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pr-10"
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </button>
            </div>
            <Button
              size="icon"
              variant="outline"
              onClick={toggleMapStyle}
              title={mapType === "hybrid" ? "Alternar para mapa padrão" : "Alternar para satélite 3D"}
            >
              <Layers className="w-4 h-4" />
            </Button>

            {searchResults.length > 0 && (
              <Card className="absolute top-full left-0 right-0 z-[2000] mt-1 shadow-xl">
                <CardContent className="p-0 divide-y max-h-52 overflow-y-auto">
                  {searchResults.map((r: any, i: number) => (
                    <button
                      key={i}
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-2"
                      onClick={() => goToResult(r)}
                    >
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate text-xs">{r.display_name}</span>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Map container */}
          <Card className="overflow-hidden border shadow-md">
            <CardContent className="p-0 relative">
              {(loading || (!mapReady && !mapError)) && (
                <div className="h-[560px] flex flex-col items-center justify-center bg-muted/30 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground">Carregando Apple Maps 3D…</p>
                </div>
              )}
              {mapError && (
                <div className="h-[560px] flex flex-col items-center justify-center bg-muted/20 gap-4 p-8">
                  <Map className="w-10 h-10 text-muted-foreground/40" />
                  <div className="text-center space-y-2 max-w-md">
                    <p className="text-sm font-semibold text-foreground">Apple Maps — Token necessário</p>
                    <p className="text-xs text-muted-foreground whitespace-pre-line">{mapError}</p>
                    <a
                      href="https://developer.apple.com/maps/web/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 text-xs text-primary underline"
                    >
                      Obter token em developer.apple.com/maps/web/
                    </a>
                  </div>
                </div>
              )}
              <div
                ref={containerRef}
                className="h-[560px] lg:h-[640px] rounded-lg"
                style={{ display: mapReady ? "block" : "none" }}
              />
              {mapReady && (
                <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1.5">
                  <span>🍎</span>
                  <span>Apple Maps 3D</span>
                </div>
              )}
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
            Clique em qualquer ponto do mapa para registrar um novo ponto estratégico do mandato
          </p>
        </div>

        {/* ── Coluna lateral: painéis ── */}
        <div className="space-y-3">
          {/* Totalizadores */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-bold text-foreground uppercase tracking-wide">
                Resumo Territorial
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-primary/8 border border-primary/20 p-2.5 text-center">
                  <p className="text-lg font-bold text-primary font-display">{calhasComCoord.length}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">Regiões mapeadas</p>
                </div>
                <div className="rounded-lg bg-muted/40 border border-border p-2.5 text-center">
                  <p className="text-lg font-bold text-foreground font-display">{locais.length}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">Pontos cadastrados</p>
                </div>
                <div className="rounded-lg bg-muted/40 border border-border p-2.5 text-center col-span-2">
                  <p className="text-base font-bold text-foreground font-display">{fmtNum(totalVotosValidos)}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">Votos válidos no território</p>
                </div>
                <div className="rounded-lg bg-secondary/8 border border-secondary/20 p-2.5 text-center col-span-2">
                  <p className="text-base font-bold font-display" style={{ color: "#7c3aed" }}>{fmtNum(totalPotencial)}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">Potencial total do mandato</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Legenda */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-bold text-foreground uppercase tracking-wide">
                Legenda Estratégica
              </p>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Regiões — Potencial de Mandato
                </p>
                {APOIO_LABELS.map((l) => (
                  <div key={l.label} className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: l.color, opacity: 0.85 }} />
                    <span className="text-[11px] text-foreground leading-tight">{l.label}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border/50 pt-2.5 space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Pontos Estratégicos
                </p>
                {TIPOS.map((t) => {
                  const count = locais.filter((l) => l.tipo === t.value).length;
                  return (
                    <div key={t.value} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm leading-none">{t.icon}</span>
                        <span className="text-[11px] text-foreground leading-tight">{t.label}</span>
                      </div>
                      {count > 0 && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">{count}</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Regiões sem coordenadas */}
          {calhasSemCoord.length > 0 && (
            <Card className="border-warning/40 bg-warning/5">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
                  <p className="text-xs font-semibold text-warning">{calhasSemCoord.length} região(s) sem coordenadas</p>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Edite as regiões abaixo e adicione latitude/longitude para exibir no mapa.
                </p>
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {calhasSemCoord.map((c) => (
                    <Badge key={c.id} variant="outline" className="text-[10px] border-warning/50 text-warning">
                      {c.nome}
                    </Badge>
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
