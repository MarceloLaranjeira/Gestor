import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import CampanhaLayout from "@/components/campanha/CampanhaLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, MapPin, Layers, Eye, EyeOff } from "lucide-react";
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

const TIPOS = [
  { value: "ponto_de_apoio", label: "Ponto de Apoio" },
  { value: "igreja", label: "Igreja" },
  { value: "comite", label: "Comitê" },
  { value: "evento", label: "Local de Evento" },
  { value: "lideranca", label: "Liderança" },
  { value: "outro", label: "Outro" },
];

const OVERLAY_LAYERS = [
  {
    id: "population",
    label: "Densidade Populacional",
    url: "https://tiles.arcgis.com/tiles/nGt4QxSblgDfeJn9/arcgis/rest/services/World_Population_Density/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri",
    opacity: 0.5,
  },
  {
    id: "terrain",
    label: "Relevo / Topografia",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri",
    opacity: 0.4,
  },
  {
    id: "roads",
    label: "Estradas e Transporte",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri",
    opacity: 0.7,
  },
];

const CampanhaMapa = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [calhas, setCalhas] = useState<Calha[]>([]);
  const [locais, setLocais] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSatellite, setShowSatellite] = useState(true);
  const [activeLayers, setActiveLayers] = useState<string[]>([]);
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const overlayLayersRef = useRef<Record<string, L.TileLayer>>({});
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

  // Keep save function ref updated with latest user
  const saveLocalFn = useCallback(async (nome: string, tipo: string, descricao: string, lat: number, lng: number) => {
    if (!user) return;
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
  }, [user]);

  useEffect(() => {
    saveLocalRef.current = saveLocalFn;
  }, [saveLocalFn]);

  // Build popup form HTML
  const buildPopupForm = (lat: number, lng: number) => {
    const container = document.createElement("div");
    container.style.minWidth = "280px";
    const fieldStyle = "width:100%;padding:6px 8px;border:1px solid #ccc;border-radius:6px;font-size:12px;box-sizing:border-box";
    const labelStyle = "font-size:11px;font-weight:600;display:block;margin-bottom:2px";
    const infoStyle = "font-size:11px;color:#555;background:#f0f4ff;padding:4px 8px;border-radius:4px;margin-bottom:2px";

    container.innerHTML = `
      <div style="font-weight:bold;font-size:14px;margin-bottom:8px;color:#1e40af">📍 Novo Local</div>
      <p style="font-size:11px;color:#666;margin:0 0 6px">Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}</p>
      <div id="popup-geo-loading" style="font-size:11px;color:#1e40af;margin-bottom:8px">⏳ Buscando informações do local...</div>
      <div id="popup-geo-info" style="display:none;margin-bottom:8px;space-y:2px">
        <p id="popup-rua" style="${infoStyle}">🛣️ Rua: —</p>
        <p id="popup-bairro" style="${infoStyle}">🏘️ Bairro: —</p>
        <p id="popup-zona" style="${infoStyle}">📍 Zona: —</p>
        <p id="popup-cidade" style="${infoStyle}">🏙️ Cidade: —</p>
      </div>
      <div style="margin-bottom:6px">
        <label style="${labelStyle}">Nome *</label>
        <input id="popup-nome" type="text" placeholder="Nome do local" style="${fieldStyle}" />
      </div>
      <div style="margin-bottom:6px">
        <label style="${labelStyle}">Tipo</label>
        <select id="popup-tipo" style="${fieldStyle};background:#fff">
          ${TIPOS.map((t) => `<option value="${t.value}">${t.label}</option>`).join("")}
        </select>
      </div>
      <div style="margin-bottom:8px">
        <label style="${labelStyle}">Descrição</label>
        <textarea id="popup-descricao" rows="2" placeholder="Descrição (opcional)" style="${fieldStyle};resize:vertical"></textarea>
      </div>
      <button id="popup-salvar" style="width:100%;padding:8px;background:#1e40af;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600">
        Salvar Local
      </button>
    `;

    // Fetch geo info and fill fields
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18`)
      .then((r) => r.json())
      .then((data) => {
        const addr = data.address || {};
        const rua = addr.road || addr.pedestrian || addr.footway || "Não identificada";
        const bairro = addr.suburb || addr.neighbourhood || addr.quarter || "Não identificado";
        const zona = addr.city_district || addr.district || addr.borough || "Não identificada";
        const cidade = addr.city || addr.town || addr.village || addr.municipality || "Não identificada";

        const ruaEl = container.querySelector("#popup-rua");
        const bairroEl = container.querySelector("#popup-bairro");
        const zonaEl = container.querySelector("#popup-zona");
        const cidadeEl = container.querySelector("#popup-cidade");
        if (ruaEl) ruaEl.textContent = `🛣️ Rua: ${rua}`;
        if (bairroEl) bairroEl.textContent = `🏘️ Bairro: ${bairro}`;
        if (zonaEl) zonaEl.textContent = `📍 Zona: ${zona}`;
        if (cidadeEl) cidadeEl.textContent = `🏙️ Cidade: ${cidade}`;

        const loadingEl = container.querySelector("#popup-geo-loading") as HTMLElement;
        const infoEl = container.querySelector("#popup-geo-info") as HTMLElement;
        if (loadingEl) loadingEl.style.display = "none";
        if (infoEl) infoEl.style.display = "block";

        // Auto-suggest name from road
        const nomeInput = container.querySelector("#popup-nome") as HTMLInputElement;
        if (nomeInput && !nomeInput.value && rua !== "Não identificada") {
          nomeInput.value = rua;
        }
      })
      .catch(() => {
        const loadingEl = container.querySelector("#popup-geo-loading") as HTMLElement;
        if (loadingEl) loadingEl.textContent = "⚠️ Não foi possível buscar informações do local";
      });

    // Attach save event
    setTimeout(() => {
      const btn = container.querySelector("#popup-salvar") as HTMLButtonElement;
      if (btn) {
        btn.addEventListener("click", () => {
          const nome = (container.querySelector("#popup-nome") as HTMLInputElement)?.value?.trim();
          const tipo = (container.querySelector("#popup-tipo") as HTMLSelectElement)?.value;
          const descricao = (container.querySelector("#popup-descricao") as HTMLTextAreaElement)?.value?.trim();
          if (!nome) {
            toast.error("Nome é obrigatório");
            return;
          }
          btn.disabled = true;
          btn.textContent = "Salvando...";
          saveLocalRef.current?.(nome, tipo || "outro", descricao || "", lat, lng).then(() => {
            mapRef.current?.closePopup();
          });
        });
      }
    }, 50);

    return container;
  };

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current).setView([-3.1, -60.0], 6);
    markersRef.current = L.layerGroup().addTo(mapRef.current);

    tileLayerRef.current = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "&copy; Esri, Maxar, Earthstar Geographics", maxZoom: 18 }
    ).addTo(mapRef.current);

    labelsLayerRef.current = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 18 }
    ).addTo(mapRef.current);

    // Click to add local with popup form
    mapRef.current.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      const content = buildPopupForm(lat, lng);
      L.popup({ maxWidth: 300, closeOnClick: false })
        .setLatLng([lat, lng])
        .setContent(content)
        .openOn(mapRef.current!);
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Toggle overlay layers
  const toggleOverlay = (layerId: string) => {
    if (!mapRef.current) return;
    const layer = OVERLAY_LAYERS.find((l) => l.id === layerId);
    if (!layer) return;

    if (activeLayers.includes(layerId)) {
      // Remove
      if (overlayLayersRef.current[layerId]) {
        mapRef.current.removeLayer(overlayLayersRef.current[layerId]);
        delete overlayLayersRef.current[layerId];
      }
      setActiveLayers((prev) => prev.filter((id) => id !== layerId));
    } else {
      // Add
      const tl = L.tileLayer(layer.url, {
        attribution: layer.attribution,
        maxZoom: 18,
        opacity: layer.opacity,
      }).addTo(mapRef.current);
      overlayLayersRef.current[layerId] = tl;
      setActiveLayers((prev) => [...prev, layerId]);
    }
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
          <p style="font-weight:bold;font-size:13px;margin:0 0 4px">${tipoIcon[l.tipo] || "📌"} ${l.nome}</p>
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

  // Focus on location from query params
  useEffect(() => {
    if (!mapRef.current || loading) return;
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    if (lat && lng) {
      const latNum = Number(lat);
      const lngNum = Number(lng);
      mapRef.current.setView([latNum, lngNum], 18);
      markersRef.current?.eachLayer((layer: any) => {
        const ll = layer.getLatLng?.();
        if (ll && Math.abs(ll.lat - latNum) < 0.0001 && Math.abs(ll.lng - lngNum) < 0.0001) {
          layer.openPopup();
        }
      });
    }
  }, [searchParams, loading, locais]);

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
          <p className="text-xs text-muted-foreground">💡 Clique em qualquer ponto do mapa para adicionar um novo local com formulário completo</p>
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

          {/* Data Layers */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-semibold">Camadas de Dados</p>
              <p className="text-xs text-muted-foreground">Ative camadas para análise estratégica</p>
              <div className="space-y-2">
                {OVERLAY_LAYERS.map((layer) => {
                  const isActive = activeLayers.includes(layer.id);
                  return (
                    <button
                      key={layer.id}
                      onClick={() => toggleOverlay(layer.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors border ${
                        isActive
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/60"
                      }`}
                    >
                      {isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      {layer.label}
                    </button>
                  );
                })}
              </div>
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
