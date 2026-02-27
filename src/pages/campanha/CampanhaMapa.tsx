import { useEffect, useState, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import CampanhaLayout from "@/components/campanha/CampanhaLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, MapPin, Layers } from "lucide-react";
import { toast } from "sonner";

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

const getColor = (pct: number) => {
  if (pct >= 40) return "#16a34a";
  if (pct >= 25) return "#1e40af";
  if (pct >= 10) return "#eab308";
  return "#dc2626";
};

const tipoIcon: Record<string, string> = {
  ponto_de_apoio: "🏠",
  igreja: "⛪",
  comite: "🏢",
  evento: "📍",
  lideranca: "👤",
  outro: "📌",
};

const CampanhaMapa = () => {
  const { user } = useAuth();
  const [calhas, setCalhas] = useState<Calha[]>([]);
  const [locais, setLocais] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSatellite, setShowSatellite] = useState(true);
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

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

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current).setView([-3.1, -60.0], 6);
    markersRef.current = L.layerGroup().addTo(mapRef.current);

    // Satellite tiles
    tileLayerRef.current = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "&copy; Esri, Maxar, Earthstar Geographics", maxZoom: 18 }
    ).addTo(mapRef.current);

    labelsLayerRef.current = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 18 }
    ).addTo(mapRef.current);

    // Click to add local
    mapRef.current.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      const nome = prompt("Nome do local:");
      if (!nome) return;
      saveLocal(nome, lat, lng);
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  const saveLocal = async (nome: string, lat: number, lng: number) => {
    if (!user) return;
    // Reverse geocode
    let endereco = "";
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      endereco = data.display_name || "";
    } catch {}

    const { error } = await supabase.from("campanha_locais").insert({
      nome,
      endereco,
      latitude: lat,
      longitude: lng,
      tipo: "outro",
      user_id: user.user_id,
    });
    if (error) {
      toast.error("Erro ao salvar local");
      return;
    }
    toast.success("Local adicionado ao mapa!");
    // Refresh
    const { data } = await supabase.from("campanha_locais").select("*").order("created_at", { ascending: false });
    setLocais((data as Local[]) || []);
  };

  // Toggle satellite/street
  const toggleMapStyle = () => {
    if (!mapRef.current || !tileLayerRef.current) return;
    mapRef.current.removeLayer(tileLayerRef.current);
    if (labelsLayerRef.current) mapRef.current.removeLayer(labelsLayerRef.current);

    if (showSatellite) {
      tileLayerRef.current = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OSM', maxZoom: 18,
      }).addTo(mapRef.current);
      labelsLayerRef.current = null;
    } else {
      tileLayerRef.current = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { attribution: "&copy; Esri", maxZoom: 18 }
      ).addTo(mapRef.current);
      labelsLayerRef.current = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 18 }
      ).addTo(mapRef.current);
    }
    setShowSatellite(!showSatellite);
  };

  // Search address
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=br&limit=5`
      );
      setSearchResults(await res.json());
    } catch {
      toast.error("Erro ao buscar endereço");
    }
    setSearching(false);
  };

  const goToResult = (r: any) => {
    if (!mapRef.current) return;
    const lat = Number(r.lat);
    const lng = Number(r.lon);
    mapRef.current.setView([lat, lng], 15);
    L.popup().setLatLng([lat, lng]).setContent(
      `<div><b>${r.display_name.split(",")[0]}</b><br/><small>${r.display_name}</small></div>`
    ).openOn(mapRef.current);
    setSearchResults([]);
    setSearchQuery("");
  };

  // Update markers when data changes
  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return;
    markersRef.current.clearLayers();

    const calhasComCoord = calhas.filter((c) => c.latitude != null && c.longitude != null);
    const maxVotos = Math.max(...calhasComCoord.map((c) => c.potencial_votos), 1);

    // Calha markers
    calhasComCoord.forEach((c) => {
      const radius = 8 + (c.potencial_votos / maxVotos) * 22;
      const marker = L.circleMarker([Number(c.latitude), Number(c.longitude)], {
        radius,
        fillColor: getColor(Number(c.percentual_cristaos)),
        fillOpacity: 0.7,
        color: "#333",
        weight: 1,
      });
      marker.bindPopup(`
        <div style="min-width:160px">
          <p style="font-weight:bold;font-size:14px;margin:0 0 4px">${c.nome}</p>
          <p style="margin:2px 0">Região: ${c.regiao || "—"}</p>
          <p style="margin:2px 0">Municípios: ${c.municipios}</p>
          <p style="margin:2px 0">Votos válidos: ${c.votos_validos.toLocaleString("pt-BR")}</p>
          <p style="margin:2px 0">Potencial: ${c.potencial_votos.toLocaleString("pt-BR")}</p>
          <p style="margin:2px 0">% Cristãos: ${Number(c.percentual_cristaos).toFixed(1)}%</p>
        </div>
      `);
      markersRef.current!.addLayer(marker);
    });

    // Local markers
    locais.forEach((l) => {
      const icon = L.divIcon({
        html: `<div style="font-size:20px;text-align:center;line-height:1">${tipoIcon[l.tipo] || "📌"}</div>`,
        className: "",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const marker = L.marker([Number(l.latitude), Number(l.longitude)], { icon });
      marker.bindPopup(`
        <div style="min-width:140px">
          <p style="font-weight:bold;font-size:13px;margin:0 0 4px">${l.nome}</p>
          <p style="margin:2px 0;font-size:11px">${l.endereco || "—"}</p>
          ${l.descricao ? `<p style="margin:2px 0;font-size:11px;color:#666">${l.descricao}</p>` : ""}
        </div>
      `);
      markersRef.current!.addLayer(marker);
    });

    // Fit bounds
    const allPoints = [
      ...calhasComCoord.map((c) => [Number(c.latitude), Number(c.longitude)] as [number, number]),
      ...locais.map((l) => [Number(l.latitude), Number(l.longitude)] as [number, number]),
    ];
    if (allPoints.length > 0) {
      mapRef.current.fitBounds(L.latLngBounds(allPoints), { padding: [40, 40], maxZoom: 10 });
    }
  }, [calhas, locais]);

  const calhasSemCoord = calhas.filter((c) => c.latitude === null || c.longitude === null);
  const calhasComCoord = calhas.filter((c) => c.latitude !== null && c.longitude !== null);

  return (
    <CampanhaLayout title="Mapa Eleitoral">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 space-y-3">
          {/* Search bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                placeholder="Buscar endereço, cidade ou local..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pr-10"
              />
              <button
                onClick={handleSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </button>
            </div>
            <Button size="icon" variant="outline" onClick={toggleMapStyle} title={showSatellite ? "Mapa padrão" : "Satélite"}>
              <Layers className="w-4 h-4" />
            </Button>
          </div>

          {/* Search results dropdown */}
          {searchResults.length > 0 && (
            <Card className="absolute z-[1000] w-[calc(100%-2rem)] lg:w-[calc(75%-2rem)]">
              <CardContent className="p-0 divide-y max-h-48 overflow-y-auto">
                {searchResults.map((r: any, i: number) => (
                  <button
                    key={i}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
                    onClick={() => goToResult(r)}
                  >
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="truncate">{r.display_name}</span>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div ref={containerRef} className="h-[500px] lg:h-[600px] rounded-lg" />
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">💡 Clique no mapa para adicionar um local rapidamente</p>
        </div>

        <div className="space-y-4">
          {/* Stats */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <p className="text-xs text-muted-foreground">
                Calhas no mapa: <span className="font-semibold text-foreground">{calhasComCoord.length}</span> de {calhas.length}
              </p>
              <p className="text-xs text-muted-foreground">
                Locais mapeados: <span className="font-semibold text-foreground">{locais.length}</span>
              </p>
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-semibold">Legenda — Calhas</p>
              <p className="text-xs text-muted-foreground">Tamanho = potencial de votos</p>
              <div className="space-y-2">
                {[
                  { label: "≥ 40% cristãos", color: "#16a34a" },
                  { label: "25–39%", color: "#1e40af" },
                  { label: "10–24%", color: "#eab308" },
                  { label: "< 10%", color: "#dc2626" },
                ].map((l) => (
                  <div key={l.label} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: l.color, opacity: 0.7 }} />
                    <span className="text-xs">{l.label}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-2 mt-2 space-y-1">
                <p className="text-sm font-semibold">Locais</p>
                {Object.entries(tipoIcon).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2">
                    <span className="text-sm">{v}</span>
                    <span className="text-xs capitalize">{k.replace(/_/g, " ")}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {calhasSemCoord.length > 0 && (
            <Card className="border-destructive/30">
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-semibold text-destructive">Sem coordenadas</p>
                <p className="text-xs text-muted-foreground">Edite essas calhas e adicione latitude/longitude.</p>
                {calhasSemCoord.map((c) => (
                  <Badge key={c.id} variant="outline" className="text-xs mr-1">{c.nome}</Badge>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </CampanhaLayout>
  );
};

export default CampanhaMapa;
