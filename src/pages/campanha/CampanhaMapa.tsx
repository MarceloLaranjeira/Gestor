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
import {
  Search, Loader2, MapPin, Layers, Eye, EyeOff,
  Users, Vote, Building2, AlertTriangle, Map,
} from "lucide-react";
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

// ── Cor por índice de apoio (campo percentual_cristaos reutilizado como índice estratégico)
const getColor = (pct: number) => {
  if (pct >= 40) return "#1d4ed8"; // alto potencial — azul forte
  if (pct >= 25) return "#7c3aed"; // potencial moderado — violeta
  if (pct >= 10) return "#0891b2"; // em desenvolvimento — ciano
  return "#dc2626";                 // área prioritária — vermelho
};

// ── Rótulos profissionais de mandato
const APOIO_LABELS = [
  { label: "Alto Potencial de Mandato", color: "#1d4ed8", min: 40 },
  { label: "Potencial Consolidado",     color: "#7c3aed", min: 25 },
  { label: "Em Desenvolvimento",        color: "#0891b2", min: 10 },
  { label: "Área Prioritária p/ Ação",  color: "#dc2626", min: 0  },
];

// ── Tipos de locais com nomenclatura profissional
const TIPOS = [
  { value: "ponto_de_apoio", label: "Ponto de Apoio Parlamentar", icon: "🏠" },
  { value: "comite",         label: "Comitê Político",            icon: "🏢" },
  { value: "lideranca",      label: "Liderança Comunitária",      icon: "👤" },
  { value: "evento",         label: "Local de Evento do Mandato", icon: "📍" },
  { value: "igreja",         label: "Local de Culto",             icon: "⛪" },
  { value: "outro",          label: "Ponto Estratégico",          icon: "📌" },
];

const tipoMap = Object.fromEntries(TIPOS.map((t) => [t.value, t]));

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
    label: "Infraestrutura Viária",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri",
    opacity: 0.7,
  },
];

// ── Formata número pt-BR
const fmtNum = (n: number) => n.toLocaleString("pt-BR");

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
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const overlayLayersRef = useRef<Record<string, L.TileLayer>>({});
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

  // Close search dropdown when clicking outside
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

  // Build popup form HTML
  const buildPopupForm = (lat: number, lng: number) => {
    const container = document.createElement("div");
    container.style.minWidth = "290px";
    const fieldStyle =
      "width:100%;padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;box-sizing:border-box;background:#fff;color:#111";
    const labelStyle =
      "font-size:11px;font-weight:600;display:block;margin-bottom:3px;color:#374151";
    const infoStyle =
      "font-size:11px;color:#4b5563;background:#f0f6ff;padding:4px 8px;border-radius:4px;margin-bottom:3px;border-left:3px solid #3b82f6";

    container.innerHTML = `
      <div style="font-weight:700;font-size:14px;margin-bottom:8px;color:#1d4ed8;display:flex;align-items:center;gap:6px">
        📍 Registrar Ponto Estratégico
      </div>
      <p style="font-size:10px;color:#6b7280;margin:0 0 8px">
        Coordenadas: ${lat.toFixed(5)}, ${lng.toFixed(5)}
      </p>
      <div id="popup-geo-loading" style="font-size:11px;color:#3b82f6;margin-bottom:8px">
        ⏳ Identificando localização...
      </div>
      <div id="popup-geo-info" style="display:none;margin-bottom:10px">
        <p id="popup-rua"    style="${infoStyle}">🛣️ Logradouro: —</p>
        <p id="popup-bairro" style="${infoStyle}">🏘️ Bairro / Distrito: —</p>
        <p id="popup-cidade" style="${infoStyle}">🏙️ Município: —</p>
      </div>
      <div style="margin-bottom:7px">
        <label style="${labelStyle}">Nome do Ponto *</label>
        <input id="popup-nome" type="text" placeholder="Ex: Comitê Central, Liderança Bairro Norte..." style="${fieldStyle}" />
      </div>
      <div style="margin-bottom:7px">
        <label style="${labelStyle}">Categoria</label>
        <select id="popup-tipo" style="${fieldStyle}">
          ${TIPOS.map((t) => `<option value="${t.value}">${t.icon} ${t.label}</option>`).join("")}
        </select>
      </div>
      <div style="margin-bottom:10px">
        <label style="${labelStyle}">Observações</label>
        <textarea id="popup-descricao" rows="2" placeholder="Contexto, referências, observações estratégicas..." style="${fieldStyle};resize:vertical"></textarea>
      </div>
      <button id="popup-salvar" style="width:100%;padding:9px;background:#1d4ed8;color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:13px;font-weight:600;transition:background 0.2s">
        ✔ Registrar Ponto
      </button>
    `;

    // Fetch geo info
    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18`
    )
      .then((r) => r.json())
      .then((data) => {
        const addr = data.address || {};
        const rua =
          addr.road || addr.pedestrian || addr.footway || "Não identificado";
        const bairro =
          addr.suburb || addr.neighbourhood || addr.quarter || addr.district || "Não identificado";
        const cidade =
          addr.city || addr.town || addr.village || addr.municipality || "Não identificada";

        const ruaEl = container.querySelector("#popup-rua") as HTMLElement;
        const bairroEl = container.querySelector("#popup-bairro") as HTMLElement;
        const cidadeEl = container.querySelector("#popup-cidade") as HTMLElement;
        if (ruaEl) ruaEl.textContent = `🛣️ Logradouro: ${rua}`;
        if (bairroEl) bairroEl.textContent = `🏘️ Bairro / Distrito: ${bairro}`;
        if (cidadeEl) cidadeEl.textContent = `🏙️ Município: ${cidade}`;

        const loadingEl = container.querySelector("#popup-geo-loading") as HTMLElement;
        const infoEl = container.querySelector("#popup-geo-info") as HTMLElement;
        if (loadingEl) loadingEl.style.display = "none";
        if (infoEl) infoEl.style.display = "block";

        // Auto-suggest name from city + neighborhood
        const nomeInput = container.querySelector("#popup-nome") as HTMLInputElement;
        if (nomeInput && !nomeInput.value && bairro !== "Não identificado") {
          nomeInput.value = `${bairro} — ${cidade}`;
        }
      })
      .catch(() => {
        const loadingEl = container.querySelector("#popup-geo-loading") as HTMLElement;
        if (loadingEl) loadingEl.textContent = "⚠️ Localização não identificada";
      });

    // Attach save event
    setTimeout(() => {
      const btn = container.querySelector("#popup-salvar") as HTMLButtonElement;
      if (btn) {
        btn.addEventListener("click", () => {
          const nome = (container.querySelector("#popup-nome") as HTMLInputElement)?.value?.trim();
          const tipo = (container.querySelector("#popup-tipo") as HTMLSelectElement)?.value;
          const descricao = (
            container.querySelector("#popup-descricao") as HTMLTextAreaElement
          )?.value?.trim();
          if (!nome) {
            toast.error("Informe o nome do ponto");
            return;
          }
          btn.disabled = true;
          btn.textContent = "Registrando...";
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

    mapRef.current = L.map(containerRef.current, { zoomControl: true }).setView(
      [-3.1, -60.0],
      6
    );
    markersRef.current = L.layerGroup().addTo(mapRef.current);

    tileLayerRef.current = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "&copy; Esri, Maxar, Earthstar Geographics", maxZoom: 19 }
    ).addTo(mapRef.current);

    labelsLayerRef.current = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19 }
    ).addTo(mapRef.current);

    // Click to add local
    mapRef.current.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      const content = buildPopupForm(lat, lng);
      L.popup({ maxWidth: 320, closeOnClick: false, className: "mandate-popup" })
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
      if (overlayLayersRef.current[layerId]) {
        mapRef.current.removeLayer(overlayLayersRef.current[layerId]);
        delete overlayLayersRef.current[layerId];
      }
      setActiveLayers((prev) => prev.filter((id) => id !== layerId));
    } else {
      const tl = L.tileLayer(layer.url, {
        attribution: layer.attribution,
        maxZoom: 19,
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
      tileLayerRef.current = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        { attribution: "&copy; OSM", maxZoom: 19 }
      ).addTo(mapRef.current);
      labelsLayerRef.current = null;
    } else {
      tileLayerRef.current = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { attribution: "&copy; Esri", maxZoom: 19 }
      ).addTo(mapRef.current);
      labelsLayerRef.current = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19 }
      ).addTo(mapRef.current);
    }
    setShowSatellite(!showSatellite);
  };

  // Search address
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
    if (!mapRef.current) return;
    const lat = Number(r.lat);
    const lng = Number(r.lon);
    mapRef.current.setView([lat, lng], 14);
    L.popup()
      .setLatLng([lat, lng])
      .setContent(
        `<div style="font-size:13px"><b>${r.display_name.split(",")[0]}</b><br/><small style="color:#6b7280">${r.display_name}</small></div>`
      )
      .openOn(mapRef.current);
    setSearchResults([]);
    setSearchQuery("");
  };

  // Update markers when data changes
  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return;
    markersRef.current.clearLayers();

    const calhasComCoord = calhas.filter(
      (c) => c.latitude != null && c.longitude != null
    );
    const maxVotos = Math.max(...calhasComCoord.map((c) => c.potencial_votos ?? 0), 1);

    // Calha markers
    calhasComCoord.forEach((c) => {
      const pct = Number(c.percentual_cristaos) || 0;
      const radius = 8 + ((c.potencial_votos ?? 0) / maxVotos) * 22;
      const label = APOIO_LABELS.find((a) => pct >= a.min) ?? APOIO_LABELS[3];

      const marker = L.circleMarker([Number(c.latitude), Number(c.longitude)], {
        radius,
        fillColor: getColor(pct),
        fillOpacity: 0.75,
        color: "#fff",
        weight: 2,
      });
      marker.bindPopup(`
        <div style="min-width:200px;font-family:sans-serif">
          <p style="font-weight:700;font-size:14px;margin:0 0 6px;color:#1d4ed8">${c.nome}</p>
          <p style="margin:3px 0;font-size:12px">
            <span style="color:#6b7280">Região:</span> <b>${c.regiao || "—"}</b>
          </p>
          <p style="margin:3px 0;font-size:12px">
            <span style="color:#6b7280">Municípios:</span> <b>${c.municipios}</b>
          </p>
          <p style="margin:3px 0;font-size:12px">
            <span style="color:#6b7280">Votos Válidos:</span> <b>${fmtNum(c.votos_validos)}</b>
          </p>
          <p style="margin:3px 0;font-size:12px">
            <span style="color:#6b7280">Potencial do Mandato:</span> <b>${fmtNum(c.potencial_votos)}</b>
          </p>
          <p style="margin:6px 0 0;font-size:11px;padding:4px 8px;border-radius:4px;background:${getColor(pct)}22;color:${getColor(pct)};font-weight:600;border-left:3px solid ${getColor(pct)}">
            ${label.label}
          </p>
        </div>
      `);
      markersRef.current!.addLayer(marker);
    });

    // Local markers
    locais.forEach((l) => {
      const tipo = tipoMap[l.tipo] ?? { icon: "📌", label: "Ponto Estratégico" };
      const icon = L.divIcon({
        html: `<div style="font-size:20px;text-align:center;line-height:1;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.5))">${tipo.icon}</div>`,
        className: "",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const marker = L.marker([Number(l.latitude), Number(l.longitude)], { icon });
      marker.bindPopup(`
        <div style="min-width:180px;font-family:sans-serif">
          <p style="font-weight:700;font-size:13px;margin:0 0 4px">${tipo.icon} ${l.nome}</p>
          <p style="font-size:11px;color:#6b7280;margin:0 0 2px">${tipo.label}</p>
          ${l.endereco ? `<p style="font-size:11px;color:#4b5563;margin:3px 0">📍 ${l.endereco}</p>` : ""}
          ${l.descricao ? `<p style="font-size:11px;color:#6b7280;margin:3px 0;font-style:italic">${l.descricao}</p>` : ""}
        </div>
      `);
      markersRef.current!.addLayer(marker);
    });

    // Fit bounds — safe check
    const allPoints: [number, number][] = [
      ...calhasComCoord.map(
        (c) => [Number(c.latitude), Number(c.longitude)] as [number, number]
      ),
      ...locais
        .filter((l) => l.latitude != null && l.longitude != null)
        .map((l) => [Number(l.latitude), Number(l.longitude)] as [number, number]),
    ];
    if (allPoints.length > 0) {
      try {
        mapRef.current.fitBounds(L.latLngBounds(allPoints), {
          padding: [50, 50],
          maxZoom: 10,
        });
      } catch {}
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
      if (!isNaN(latNum) && !isNaN(lngNum)) {
        mapRef.current.setView([latNum, lngNum], 16);
        markersRef.current?.eachLayer((layer: any) => {
          const ll = layer.getLatLng?.();
          if (
            ll &&
            Math.abs(ll.lat - latNum) < 0.001 &&
            Math.abs(ll.lng - lngNum) < 0.001
          ) {
            layer.openPopup();
          }
        });
      }
    }
  }, [searchParams, loading, locais]);

  // Derived stats
  const calhasComCoord = calhas.filter(
    (c) => c.latitude !== null && c.longitude !== null
  );
  const calhasSemCoord = calhas.filter(
    (c) => c.latitude === null || c.longitude === null
  );
  const totalVotosValidos = calhas.reduce((s, c) => s + (c.votos_validos ?? 0), 0);
  const totalPotencial = calhas.reduce((s, c) => s + (c.potencial_votos ?? 0), 0);

  // Locais count by tipo
  const locaisPorTipo = TIPOS.map((t) => ({
    ...t,
    count: locais.filter((l) => l.tipo === t.value).length,
  })).filter((t) => t.count > 0);

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
                {searching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </button>
            </div>
            <Button
              size="icon"
              variant="outline"
              onClick={toggleMapStyle}
              title={showSatellite ? "Alternar para mapa padrão" : "Alternar para satélite"}
            >
              <Layers className="w-4 h-4" />
            </Button>

            {/* Search results dropdown — positioned relative to the search box */}
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
            <CardContent className="p-0">
              {loading && (
                <div className="h-[560px] flex items-center justify-center bg-muted/30">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}
              <div
                ref={containerRef}
                className="h-[560px] lg:h-[640px] rounded-lg"
                style={{ display: loading ? "none" : "block" }}
              />
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
                  <p className="text-lg font-bold text-primary font-display">
                    {calhasComCoord.length}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Regiões mapeadas
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 border border-border p-2.5 text-center">
                  <p className="text-lg font-bold text-foreground font-display">
                    {locais.length}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Pontos cadastrados
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 border border-border p-2.5 text-center col-span-2">
                  <p className="text-base font-bold text-foreground font-display">
                    {fmtNum(totalVotosValidos)}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Votos válidos no território
                  </p>
                </div>
                <div className="rounded-lg bg-secondary/8 border border-secondary/20 p-2.5 text-center col-span-2">
                  <p className="text-base font-bold font-display" style={{ color: "#7c3aed" }}>
                    {fmtNum(totalPotencial)}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Potencial total do mandato
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Camadas de Dados */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <p className="text-xs font-bold text-foreground uppercase tracking-wide">
                Camadas de Análise
              </p>
              <p className="text-[10px] text-muted-foreground">
                Sobreponha dados para análise estratégica
              </p>
              <div className="space-y-1.5 pt-1">
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
                      {isActive ? (
                        <Eye className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 shrink-0" />
                      )}
                      {layer.label}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Legenda — Potencial de Mandato */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-bold text-foreground uppercase tracking-wide">
                Legenda Estratégica
              </p>

              {/* Regiões / Calhas */}
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Regiões — Tamanho = Potencial
                </p>
                {APOIO_LABELS.map((l) => (
                  <div key={l.label} className="flex items-center gap-2.5">
                    <div
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: l.color, opacity: 0.85 }}
                    />
                    <span className="text-[11px] text-foreground leading-tight">
                      {l.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Pontos Estratégicos */}
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
                        <span className="text-[11px] text-foreground leading-tight">
                          {t.label}
                        </span>
                      </div>
                      {count > 0 && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                          {count}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Regiões sem coordenadas — aviso compacto */}
          {calhasSemCoord.length > 0 && (
            <Card className="border-warning/40 bg-warning/5">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
                  <p className="text-xs font-semibold text-warning">
                    {calhasSemCoord.length} região(s) sem coordenadas
                  </p>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Edite as regiões abaixo e adicione latitude/longitude para exibir no mapa.
                </p>
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {calhasSemCoord.map((c) => (
                    <Badge
                      key={c.id}
                      variant="outline"
                      className="text-[10px] border-warning/50 text-warning"
                    >
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
