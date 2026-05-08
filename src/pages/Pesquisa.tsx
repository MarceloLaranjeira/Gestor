import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  BarChart2, Box, Check, ClipboardList, Crosshair, Building2,
  Eye, EyeOff, Home, Layers, Loader2, Mail, MapPin, MapPinned,
  Pencil, Phone, Plus, Target, Trash2, TrendingUp, User, Users, X,
  Car, Globe, Map, Satellite, Thermometer,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/* ─── types ──────────────────────────────────────────────────────── */
type ZonaTipo   = "bairro" | "rua" | "zona";
type SideTab    = "zonas" | "pessoas" | "censo" | "painel";
type BaseMap    = "mapa" | "satelite" | "hibrido";
type OverlayId  = "transito" | "densidade" | "bairros" | "zonas";

interface PesquisaPessoa {
  id: string; nome: string; telefone: string | null; email: string | null;
  cargo: string | null; cor: string; user_id: string; created_at: string;
}
interface PesquisaZona {
  id: string; nome: string; tipo: ZonaTipo; cor: string;
  lider_nome: string | null; lider_telefone: string | null; lider_cor: string;
  responsavel_id: string | null; coordinates: number[][];
  censo_residencias: number; censo_populacao: number;
  censo_apoiadores: number; censo_visitados: number;
  user_id: string; created_at: string;
}
interface ZonaForm {
  nome: string; tipo: ZonaTipo; cor: string; responsavel_id: string;
  censo_residencias: string; censo_populacao: string;
  censo_apoiadores: string; censo_visitados: string;
}
interface PessoaForm {
  nome: string; telefone: string; email: string; cargo: string; cor: string;
}

/* ─── constants ──────────────────────────────────────────────────── */
const TIPO_CONFIG: Record<ZonaTipo, { label: string; cor: string; icon: typeof Home }> = {
  bairro: { label: "Bairro", cor: "#6366f1", icon: Home },
  rua:    { label: "Rua",    cor: "#10b981", icon: MapPin },
  zona:   { label: "Zona",   cor: "#f59e0b", icon: Target },
};
const PRESET_CORES = [
  "#6366f1","#8b5cf6","#ec4899","#ef4444","#f97316","#f59e0b",
  "#22c55e","#10b981","#06b6d4","#3b82f6","#0ea5e9","#64748b",
];
const MAP_CENTER: [number, number] = [-60.0217, -3.1190];
const MAP_ZOOM = 13;

/* tile URLs ────────────────────────────────────────────────────────── */
const TILES = {
  osm:        ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
  satellite:  ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
  transport:  ["https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"],
  boundaries: ["https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"],
};

/* which base layers are visible per base-map choice */
const BASE_VISIBILITY: Record<BaseMap, Record<string, "visible" | "none">> = {
  mapa:     { "base-osm": "visible", "base-sat": "none",     "base-sat-labels": "none" },
  satelite: { "base-osm": "none",    "base-sat": "visible",  "base-sat-labels": "none" },
  hibrido:  { "base-osm": "none",    "base-sat": "visible",  "base-sat-labels": "visible" },
};

/* ─── initial map style (all sources/layers pre-declared) ─────────── */
function buildStyle(): maplibregl.StyleSpecification {
  return {
    version: 8,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      "src-osm":        { type: "raster", tiles: TILES.osm,        tileSize: 256, attribution: "© OpenStreetMap" },
      "src-sat":        { type: "raster", tiles: TILES.satellite,   tileSize: 256 },
      "src-transport":  { type: "raster", tiles: TILES.transport,   tileSize: 256 },
      "src-boundaries": { type: "raster", tiles: TILES.boundaries,  tileSize: 256 },
      "src-density":    { type: "geojson", data: { type: "FeatureCollection", features: [] } },
    },
    layers: [
      /* base — raster */
      { id: "base-osm",        type: "raster", source: "src-osm",        layout: { visibility: "visible" } },
      { id: "base-sat",        type: "raster", source: "src-sat",        layout: { visibility: "none"    }, paint: { "raster-opacity": 1 } },
      { id: "base-sat-labels", type: "raster", source: "src-boundaries", layout: { visibility: "none"    }, paint: { "raster-opacity": 0.9 } },
      /* overlays — raster */
      { id: "ov-transito",     type: "raster", source: "src-transport",  layout: { visibility: "none"    }, paint: { "raster-opacity": 0.7 } },
      { id: "ov-bairros",      type: "raster", source: "src-boundaries", layout: { visibility: "none"    }, paint: { "raster-opacity": 0.85 } },
      /* density heatmap */
      {
        id: "ov-densidade", type: "heatmap", source: "src-density",
        layout: { visibility: "none" },
        paint: {
          "heatmap-weight": ["interpolate", ["linear"], ["get", "weight"], 0, 0, 50000, 1],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 15, 3],
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(33,102,172,0)",
            0.2, "rgba(103,169,207,0.6)",
            0.4, "rgba(209,229,240,0.7)",
            0.6, "rgba(253,219,199,0.8)",
            0.8, "rgba(239,138,98,0.9)",
            1, "rgba(178,24,43,1)",
          ],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 4, 15, 40],
          "heatmap-opacity": 0.8,
        },
      } as unknown as maplibregl.LayerSpecification,
    ],
  };
}

/* ─── helpers ────────────────────────────────────────────────────── */
const emptyZonaForm = (): ZonaForm => ({
  nome: "", tipo: "bairro", cor: TIPO_CONFIG.bairro.cor, responsavel_id: "",
  censo_residencias: "0", censo_populacao: "0", censo_apoiadores: "0", censo_visitados: "0",
});
const emptyPessoaForm = (): PessoaForm => ({ nome: "", telefone: "", email: "", cargo: "", cor: PRESET_CORES[0] });

function zoneColor(zona: PesquisaZona, pessoas: PesquisaPessoa[]): string {
  if (zona.responsavel_id) { const p = pessoas.find((x) => x.id === zona.responsavel_id); if (p) return p.cor; }
  return zona.cor || TIPO_CONFIG[zona.tipo]?.cor || "#6366f1";
}
function centroid(coords: number[][]): [number, number] {
  return [coords.reduce((s, c) => s + c[0], 0) / coords.length, coords.reduce((s, c) => s + c[1], 0) / coords.length];
}
function bboxOfCoords(coords: number[][]): [[number, number], [number, number]] {
  const lngs = coords.map((c) => c[0]), lats = coords.map((c) => c[1]);
  return [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]];
}
function initials(name: string) { return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase(); }

/* ─── ColorPicker ────────────────────────────────────────────────── */
function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PRESET_CORES.map((c) => (
        <button key={c} type="button" onClick={() => onChange(c)}
          className={cn("w-6 h-6 rounded-full border-2 transition-transform hover:scale-110", value === c ? "border-foreground scale-110" : "border-transparent")}
          style={{ background: c }} />
      ))}
    </div>
  );
}

/* ─── layer bar config ───────────────────────────────────────────── */
const BASE_OPTS: { id: BaseMap; label: string; icon: typeof Map }[] = [
  { id: "mapa",     label: "Mapa",      icon: Map },
  { id: "satelite", label: "Satélite",  icon: Globe },
  { id: "hibrido",  label: "Híbrido",   icon: Satellite },
];
const OVERLAY_OPTS: { id: OverlayId; label: string; icon: typeof Layers; color: string }[] = [
  { id: "transito",  label: "Trânsito",   icon: Car,         color: "#f97316" },
  { id: "densidade", label: "Densidade",  icon: Thermometer, color: "#ef4444" },
  { id: "bairros",   label: "Bairros",    icon: Building2,   color: "#6366f1" },
  { id: "zonas",     label: "Minhas Zonas", icon: Target,    color: "#10b981" },
];

/* ══════════════════════════════════════════════════════════════════ */
export default function Pesquisa() {
  const { user } = useAuth();
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<maplibregl.Map | null>(null);
  const popupRef     = useRef<maplibregl.Popup | null>(null);
  const drawRef      = useRef<number[][]>([]);
  const markersRef   = useRef<maplibregl.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);

  /* data */
  const [zonas,   setZonas]   = useState<PesquisaZona[]>([]);
  const [pessoas, setPessoas] = useState<PesquisaPessoa[]>([]);
  const [loading, setLoading] = useState(true);

  /* map controls */
  const [activeBase,   setActiveBase]   = useState<BaseMap>("mapa");
  const [activeLayers, setActiveLayers] = useState<Set<OverlayId>>(new Set(["zonas"]));
  const [is3D,         setIs3D]         = useState(true);

  /* sidebar */
  const [activeTab,        setActiveTab]        = useState<SideTab>("zonas");
  const [selectedPessoaId, setSelectedPessoaId] = useState<string | null>(null);
  const [hiddenIds,        setHiddenIds]         = useState<Set<string>>(new Set());

  /* draw */
  const [drawing, setDrawing] = useState(false);
  const [drawPts, setDrawPts] = useState(0);

  /* zona dialog */
  const [zonaDialog,    setZonaDialog]    = useState(false);
  const [zonaForm,      setZonaForm]      = useState<ZonaForm>(emptyZonaForm());
  const [editingZonaId, setEditingZonaId] = useState<string | null>(null);
  const [savingZona,    setSavingZona]    = useState(false);
  const [deletingZona,  setDeletingZona]  = useState<string | null>(null);

  /* pessoa dialog */
  const [pessoaDialog,    setPessoaDialog]    = useState(false);
  const [pessoaForm,      setPessoaForm]      = useState<PessoaForm>(emptyPessoaForm());
  const [editingPessoaId, setEditingPessoaId] = useState<string | null>(null);
  const [savingPessoa,    setSavingPessoa]    = useState(false);
  const [deletingPessoa,  setDeletingPessoa]  = useState<string | null>(null);

  /* ─── load ───────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    if (!user?.user_id) return;
    const [{ data: zData }, { data: pData }] = await Promise.all([
      supabase.from("pesquisa_zonas").select("*").eq("user_id", user.user_id).order("created_at", { ascending: false }),
      supabase.from("pesquisa_pessoas").select("*").eq("user_id", user.user_id).order("nome"),
    ]);
    setZonas((zData as PesquisaZona[]) ?? []);
    setPessoas((pData as PesquisaPessoa[]) ?? []);
  }, [user?.user_id]);

  useEffect(() => { void load().finally(() => setLoading(false)); }, [load]);

  /* ─── map init ───────────────────────────────────────────────── */
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildStyle(),
      center: MAP_CENTER, zoom: MAP_ZOOM, pitch: 45, bearing: -10, antialias: true,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-right");
    map.on("load", () => { mapRef.current = map; setMapReady(true); });
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  /* ─── base map switch ────────────────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const vis = BASE_VISIBILITY[activeBase];
    Object.entries(vis).forEach(([id, v]) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", v);
    });
  }, [activeBase, mapReady]);

  /* ─── overlay toggles ────────────────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const toMapLayer: Partial<Record<OverlayId, string>> = {
      transito:  "ov-transito",
      densidade: "ov-densidade",
      bairros:   "ov-bairros",
    };
    Object.entries(toMapLayer).forEach(([id, lid]) => {
      if (lid && map.getLayer(lid)) {
        map.setLayoutProperty(lid, "visibility", activeLayers.has(id as OverlayId) ? "visible" : "none");
      }
    });
  }, [activeLayers, mapReady]);

  /* ─── density source update ──────────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const src = map.getSource("src-density") as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    const fc: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: zonas
        .filter((z) => z.censo_populacao > 0 && z.coordinates.length > 0)
        .map((z) => ({
          type: "Feature" as const,
          properties: { weight: z.censo_populacao },
          geometry: { type: "Point" as const, coordinates: centroid(z.coordinates) },
        })),
    };
    src.setData(fc);
  }, [zonas, mapReady]);

  /* ─── render user zones ──────────────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    zonas.forEach(({ id }) => {
      ["fill", "line", "label"].forEach((s) => { if (map.getLayer(`z-${s}-${id}`)) map.removeLayer(`z-${s}-${id}`); });
      if (map.getSource(`z-src-${id}`)) map.removeSource(`z-src-${id}`);
    });

    if (!activeLayers.has("zonas")) return;

    zonas.forEach((zona) => {
      if (hiddenIds.has(zona.id) || zona.coordinates.length < 3) return;
      const color  = zoneColor(zona, pessoas);
      const dimmed = selectedPessoaId !== null && zona.responsavel_id !== selectedPessoaId;

      const geojson: GeoJSON.Feature<GeoJSON.Polygon> = {
        type: "Feature", properties: {},
        geometry: { type: "Polygon", coordinates: [[...zona.coordinates, zona.coordinates[0]]] },
      };
      map.addSource(`z-src-${zona.id}`, { type: "geojson", data: geojson });
      map.addLayer({ id: `z-fill-${zona.id}`,  type: "fill",   source: `z-src-${zona.id}`, paint: { "fill-color": color, "fill-opacity": dimmed ? 0.04 : 0.28 } });
      map.addLayer({ id: `z-line-${zona.id}`,  type: "line",   source: `z-src-${zona.id}`, paint: { "line-color": color, "line-width": selectedPessoaId && zona.responsavel_id === selectedPessoaId ? 3.5 : 2, "line-opacity": dimmed ? 0.15 : 1 } });
      map.addLayer({ id: `z-label-${zona.id}`, type: "symbol", source: `z-src-${zona.id}`,
        layout: { "text-field": zona.nome, "text-size": 11, "text-anchor": "center" },
        paint: { "text-color": "#fff", "text-halo-color": color, "text-halo-width": 2, "text-opacity": dimmed ? 0.2 : 1 } });

      const responsavel = zona.responsavel_id ? pessoas.find((p) => p.id === zona.responsavel_id) : null;
      const pct = zona.censo_residencias > 0 ? Math.round((zona.censo_visitados / zona.censo_residencias) * 100) : 0;
      map.on("click", `z-fill-${zona.id}`, (e) => {
        popupRef.current?.remove();
        popupRef.current = new maplibregl.Popup({ maxWidth: "280px" })
          .setLngLat(e.lngLat)
          .setHTML(`<div style="font-family:system-ui;padding:4px;font-size:12px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <span style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0"></span>
              <strong style="font-size:13px">${zona.nome}</strong>
              <span style="font-size:9px;padding:1px 6px;border-radius:99px;background:${color}22;color:${color};font-weight:700">${TIPO_CONFIG[zona.tipo].label}</span>
            </div>
            ${responsavel ? `<div style="display:flex;align-items:center;gap:8px;background:#f5f5f5;border-radius:8px;padding:6px 8px;margin-bottom:6px">
              <span style="width:28px;height:28px;border-radius:50%;background:${responsavel.cor};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:11px;flex-shrink:0">${initials(responsavel.nome)}</span>
              <div><div style="font-weight:600">${responsavel.nome}</div>${responsavel.cargo ? `<div style="font-size:10px;color:#777">${responsavel.cargo}</div>` : ""}</div>
            </div>` : ""}
            ${zona.censo_residencias > 0 ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:10px">
              <div style="background:#f5f5f5;border-radius:6px;padding:4px 6px"><div style="font-weight:700">${zona.censo_residencias.toLocaleString()}</div><div style="color:#888">Residências</div></div>
              <div style="background:#f5f5f5;border-radius:6px;padding:4px 6px"><div style="font-weight:700">${zona.censo_populacao.toLocaleString()}</div><div style="color:#888">População</div></div>
              <div style="background:#f5f5f5;border-radius:6px;padding:4px 6px"><div style="font-weight:700">${zona.censo_apoiadores.toLocaleString()}</div><div style="color:#888">Apoiadores</div></div>
              <div style="background:#22c55e22;border-radius:6px;padding:4px 6px"><div style="font-weight:700;color:#22c55e">${pct}%</div><div style="color:#888">Visitados</div></div>
            </div>` : ""}
          </div>`)
          .addTo(map);
      });
      map.on("mouseenter", `z-fill-${zona.id}`, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", `z-fill-${zona.id}`, () => { map.getCanvas().style.cursor = drawing ? "crosshair" : ""; });
    });
  }, [zonas, pessoas, hiddenIds, selectedPessoaId, activeLayers, mapReady, drawing]);

  /* ─── drawing ────────────────────────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const onClick = (e: maplibregl.MapMouseEvent) => {
      if (!drawing) return;
      const pt: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      drawRef.current = [...drawRef.current, pt];
      setDrawPts(drawRef.current.length);
      const el = Object.assign(document.createElement("div"), {
        style: "width:10px;height:10px;background:#f97316;border:2px solid white;border-radius:50%;box-shadow:0 0 4px rgba(0,0,0,.5)",
      });
      markersRef.current.push(new maplibregl.Marker({ element: el }).setLngLat(e.lngLat).addTo(map));
      const coords = drawRef.current;
      if (coords.length >= 2) {
        const data: GeoJSON.Feature<GeoJSON.Polygon> = { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[...coords, coords[0]]] } };
        if (map.getSource("dp")) (map.getSource("dp") as maplibregl.GeoJSONSource).setData(data);
        else {
          map.addSource("dp", { type: "geojson", data });
          map.addLayer({ id: "dp-fill", type: "fill", source: "dp", paint: { "fill-color": "#f97316", "fill-opacity": 0.15 } });
          map.addLayer({ id: "dp-line", type: "line", source: "dp", paint: { "line-color": "#f97316", "line-width": 2, "line-dasharray": [4, 2] } });
        }
      }
    };
    const onDbl = (e: maplibregl.MapMouseEvent) => {
      if (!drawing) return;
      e.preventDefault();
      if (drawRef.current.length < 3) { toast({ title: "Adicione ao menos 3 pontos", variant: "destructive" }); return; }
      commitDraw();
    };

    if (drawing) { map.getCanvas().style.cursor = "crosshair"; map.on("click", onClick); map.on("dblclick", onDbl); }
    return () => { map.off("click", onClick); map.off("dblclick", onDbl); };
  }, [drawing, mapReady, toast]);

  const clearDraw = () => {
    const map = mapRef.current;
    markersRef.current.forEach((m) => m.remove()); markersRef.current = [];
    if (map) { ["dp-fill", "dp-line"].forEach((l) => { if (map.getLayer(l)) map.removeLayer(l); }); if (map.getSource("dp")) map.removeSource("dp"); map.getCanvas().style.cursor = ""; }
    drawRef.current = []; setDrawPts(0);
  };
  const commitDraw = () => { setDrawing(false); if (drawRef.current.length >= 3) { setZonaForm(emptyZonaForm()); setEditingZonaId(null); setZonaDialog(true); clearDraw(); } else clearDraw(); };
  const cancelDraw = () => { setDrawing(false); clearDraw(); };

  /* ─── zona CRUD ──────────────────────────────────────────────── */
  const saveZona = async () => {
    if (!user?.user_id || !zonaForm.nome.trim()) { toast({ title: "Nome obrigatório", variant: "destructive" }); return; }
    const coords = editingZonaId ? (zonas.find((z) => z.id === editingZonaId)?.coordinates ?? []) : drawRef.current;
    setSavingZona(true);
    try {
      const payload = {
        nome: zonaForm.nome.trim(), tipo: zonaForm.tipo, cor: zonaForm.cor,
        responsavel_id: zonaForm.responsavel_id || null,
        lider_nome: null, lider_telefone: null, lider_cor: zonaForm.cor,
        coordinates: coords,
        censo_residencias: Number(zonaForm.censo_residencias) || 0,
        censo_populacao:   Number(zonaForm.censo_populacao)   || 0,
        censo_apoiadores:  Number(zonaForm.censo_apoiadores)  || 0,
        censo_visitados:   Number(zonaForm.censo_visitados)   || 0,
        user_id: user.user_id, updated_at: new Date().toISOString(),
      };
      if (editingZonaId) { const { error } = await supabase.from("pesquisa_zonas").update(payload).eq("id", editingZonaId); if (error) throw error; }
      else               { const { error } = await supabase.from("pesquisa_zonas").insert(payload);                         if (error) throw error; }
      setZonaDialog(false); setEditingZonaId(null); drawRef.current = [];
      toast({ title: editingZonaId ? "Zona atualizada!" : "Zona criada!" });
      await load();
    } catch (err) { toast({ title: "Erro ao salvar", description: err instanceof Error ? err.message : undefined, variant: "destructive" }); }
    finally { setSavingZona(false); }
  };
  const editZona = (z: PesquisaZona) => {
    setZonaForm({ nome: z.nome, tipo: z.tipo, cor: z.cor, responsavel_id: z.responsavel_id ?? "",
      censo_residencias: String(z.censo_residencias ?? 0), censo_populacao: String(z.censo_populacao ?? 0),
      censo_apoiadores: String(z.censo_apoiadores ?? 0), censo_visitados: String(z.censo_visitados ?? 0) });
    setEditingZonaId(z.id); setZonaDialog(true);
  };
  const deleteZona = async (id: string) => {
    setDeletingZona(id);
    await supabase.from("pesquisa_zonas").delete().eq("id", id);
    setDeletingZona(null); toast({ title: "Zona removida" }); await load();
  };

  /* ─── pessoa CRUD ────────────────────────────────────────────── */
  const savePessoa = async () => {
    if (!user?.user_id || !pessoaForm.nome.trim()) { toast({ title: "Nome obrigatório", variant: "destructive" }); return; }
    setSavingPessoa(true);
    try {
      const payload = { nome: pessoaForm.nome.trim(), telefone: pessoaForm.telefone || null, email: pessoaForm.email || null, cargo: pessoaForm.cargo || null, cor: pessoaForm.cor, user_id: user.user_id, updated_at: new Date().toISOString() };
      if (editingPessoaId) { const { error } = await supabase.from("pesquisa_pessoas").update(payload).eq("id", editingPessoaId); if (error) throw error; }
      else                 { const { error } = await supabase.from("pesquisa_pessoas").insert(payload);                           if (error) throw error; }
      setPessoaDialog(false); setEditingPessoaId(null);
      toast({ title: editingPessoaId ? "Atualizado!" : "Responsável cadastrado!" });
      await load();
    } catch (err) { toast({ title: "Erro ao salvar", description: err instanceof Error ? err.message : undefined, variant: "destructive" }); }
    finally { setSavingPessoa(false); }
  };
  const editPessoa = (p: PesquisaPessoa) => {
    setPessoaForm({ nome: p.nome, telefone: p.telefone ?? "", email: p.email ?? "", cargo: p.cargo ?? "", cor: p.cor });
    setEditingPessoaId(p.id); setPessoaDialog(true);
  };
  const deletePessoa = async (id: string) => {
    setDeletingPessoa(id);
    await supabase.from("pesquisa_pessoas").delete().eq("id", id);
    setDeletingPessoa(null); toast({ title: "Responsável removido" }); await load();
  };

  /* ─── map actions ────────────────────────────────────────────── */
  const recenter = () => mapRef.current?.flyTo({ center: MAP_CENTER, zoom: MAP_ZOOM, pitch: is3D ? 45 : 0, bearing: is3D ? -10 : 0, speed: 1.2 });
  const toggle3D = () => { const n = !is3D; setIs3D(n); mapRef.current?.easeTo({ pitch: n ? 45 : 0, bearing: n ? -10 : 0, duration: 800 }); };

  const toggleLayer = (id: OverlayId) => {
    setActiveLayers((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const focusPessoa = (id: string) => {
    const same = selectedPessoaId === id;
    setSelectedPessoaId(same ? null : id);
    if (!same) {
      const myZonas = zonas.filter((z) => z.responsavel_id === id && z.coordinates.length >= 3);
      if (!myZonas.length) return;
      const [sw, ne] = bboxOfCoords(myZonas.flatMap((z) => z.coordinates));
      mapRef.current?.fitBounds([sw, ne], { padding: 80, pitch: is3D ? 45 : 0, duration: 1200 });
    }
  };
  const flyToZona = (z: PesquisaZona) => {
    if (!z.coordinates.length) return;
    mapRef.current?.flyTo({ center: centroid(z.coordinates), zoom: 15, pitch: is3D ? 50 : 0, speed: 1.2 });
  };

  /* ─── stats ──────────────────────────────────────────────────── */
  const totalRes = zonas.reduce((s, z) => s + (z.censo_residencias ?? 0), 0);
  const totalPop = zonas.reduce((s, z) => s + (z.censo_populacao   ?? 0), 0);
  const totalAp  = zonas.reduce((s, z) => s + (z.censo_apoiadores  ?? 0), 0);
  const totalVis = zonas.reduce((s, z) => s + (z.censo_visitados   ?? 0), 0);
  const pctVis   = totalRes > 0 ? Math.round((totalVis / totalRes) * 100) : 0;

  const TABS: { id: SideTab; label: string; icon: typeof Layers }[] = [
    { id: "zonas",   label: "Zonas",   icon: Layers },
    { id: "pessoas", label: "Pessoas", icon: Users },
    { id: "censo",   label: "Censo",   icon: ClipboardList },
    { id: "painel",  label: "Painel",  icon: BarChart2 },
  ];

  /* ══ RENDER ══════════════════════════════════════════════════════ */
  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)] -mt-4 -mx-4 sm:-mx-6 overflow-hidden">

        {/* ── top toolbar ──────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-4 py-2 bg-card border-b border-border/60 z-10 flex-wrap shrink-0">
          <div className="flex items-center gap-2">
            <MapPinned className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold">Modo Pesquisa</span>
          </div>
          <div className="h-4 w-px bg-border/50 mx-1 hidden sm:block" />
          {!drawing ? (
            <Button size="sm" onClick={() => { drawRef.current = []; setDrawPts(0); setDrawing(true); }} className="h-8 gap-1.5 text-xs">
              <Pencil className="w-3.5 h-3.5" /> Desenhar Zona
            </Button>
          ) : (
            <>
              <Button size="sm" onClick={commitDraw} className="h-8 gap-1.5 text-xs bg-green-600 hover:bg-green-700">
                <Check className="w-3.5 h-3.5" /> Concluir ({drawPts} pts)
              </Button>
              <Button size="sm" variant="outline" onClick={cancelDraw} className="h-8 gap-1.5 text-xs">
                <X className="w-3.5 h-3.5" /> Cancelar
              </Button>
              <span className="text-[11px] text-amber-500 font-medium animate-pulse hidden sm:inline">
                Clique → pontos · Duplo-clique → fechar
              </span>
            </>
          )}
          <div className="flex items-center gap-1 ml-auto">
            <Button size="sm" variant="outline" onClick={recenter} className="h-8 w-8 p-0" title="Recentralizar">
              <Crosshair className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="outline" onClick={toggle3D} className="h-8 gap-1 text-xs px-2.5">
              <Box className="w-3.5 h-3.5" /> {is3D ? "2D" : "3D"}
            </Button>
          </div>
        </div>

        {/* ── body ──────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── left sidebar ────────────────────────────────────── */}
          <div className="w-72 h-full bg-card border-r border-border/60 flex flex-col z-10 shrink-0 overflow-hidden">
            {/* tabs */}
            <div className="flex border-b border-border/60 shrink-0">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={cn("flex-1 flex flex-col items-center py-2 gap-0.5 text-[9px] font-bold uppercase tracking-wide transition-colors",
                    activeTab === id ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground")}>
                  <Icon className="w-3.5 h-3.5" />{label}
                </button>
              ))}
            </div>

            {/* ── zonas tab ───────────────────────────────────── */}
            {activeTab === "zonas" && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="px-3 py-2 border-b border-border/40 flex items-center justify-between shrink-0">
                  <span className="text-xs font-semibold">{zonas.length} zonas</span>
                  <button onClick={() => { drawRef.current = []; setDrawPts(0); setDrawing(true); }} className="p-1 rounded hover:bg-muted text-primary"><Plus className="w-3.5 h-3.5" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {zonas.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground"><MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-xs">Nenhuma zona. Clique em "Desenhar Zona".</p></div>
                  ) : zonas.map((zona) => {
                    const color = zoneColor(zona, pessoas);
                    const resp  = zona.responsavel_id ? pessoas.find((p) => p.id === zona.responsavel_id) : null;
                    const dim   = selectedPessoaId && zona.responsavel_id !== selectedPessoaId;
                    return (
                      <div key={zona.id} className={cn("rounded-xl border border-border/50 p-2.5 transition-all", dim && "opacity-40")}>
                        <div className="flex items-start gap-2">
                          <div className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ background: color }} />
                          <div className="flex-1 min-w-0">
                            <button onClick={() => flyToZona(zona)} className="text-xs font-semibold hover:text-primary text-left truncate w-full">{zona.nome}</button>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${color}22`, color }}>{TIPO_CONFIG[zona.tipo].label}</span>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button onClick={() => setHiddenIds((s) => { const n = new Set(s); n.has(zona.id) ? n.delete(zona.id) : n.add(zona.id); return n; })} className="p-1 rounded hover:bg-muted text-muted-foreground">
                              {hiddenIds.has(zona.id) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                            <button onClick={() => editZona(zona)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil className="w-3 h-3" /></button>
                            <button onClick={() => deleteZona(zona.id)} disabled={deletingZona === zona.id} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                              {deletingZona === zona.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                        {resp && (
                          <div className="mt-2 flex items-center gap-2 rounded-lg bg-muted/40 px-2 py-1.5">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0" style={{ background: resp.cor }}>{initials(resp.nome)}</div>
                            <span className="text-[10px] font-medium truncate">{resp.nome}</span>
                            {resp.cargo && <span className="text-[9px] text-muted-foreground truncate">· {resp.cargo}</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="px-3 py-2 border-t border-border/40 space-y-1 shrink-0">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">Legenda</p>
                  {(Object.entries(TIPO_CONFIG) as [ZonaTipo, { label: string; cor: string }][]).map(([t, cfg]) => (
                    <div key={t} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="w-3 h-1.5 rounded-full" style={{ background: cfg.cor }} />{cfg.label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── pessoas tab ─────────────────────────────────── */}
            {activeTab === "pessoas" && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="px-3 py-2 border-b border-border/40 flex items-center justify-between shrink-0">
                  <span className="text-xs font-semibold">{pessoas.length} responsáveis</span>
                  <button onClick={() => { setPessoaForm(emptyPessoaForm()); setEditingPessoaId(null); setPessoaDialog(true); }} className="p-1 rounded hover:bg-muted text-primary"><Plus className="w-3.5 h-3.5" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {pessoas.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground"><Users className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-xs">Nenhum responsável cadastrado.</p></div>
                  ) : pessoas.map((p) => {
                    const myZonas  = zonas.filter((z) => z.responsavel_id === p.id);
                    const isSel    = selectedPessoaId === p.id;
                    return (
                      <div key={p.id} className={cn("rounded-xl border p-3 cursor-pointer transition-all", isSel ? "border-primary bg-primary/5" : "border-border/50 hover:bg-muted/30")} onClick={() => focusPessoa(p.id)}>
                        <div className="flex items-start gap-2.5">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ background: p.cor }}>{initials(p.nome)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate">{p.nome}</p>
                            {p.cargo    && <p className="text-[10px] text-muted-foreground truncate">{p.cargo}</p>}
                            {p.telefone && <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5"><Phone className="w-2.5 h-2.5" />{p.telefone}</p>}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: `${p.cor}22`, color: p.cor }}>{myZonas.length} zona{myZonas.length !== 1 ? "s" : ""}</span>
                            <div className="flex gap-0.5">
                              <button onClick={(e) => { e.stopPropagation(); editPessoa(p); }} className="p-1 rounded hover:bg-muted text-muted-foreground"><Pencil className="w-2.5 h-2.5" /></button>
                              <button onClick={(e) => { e.stopPropagation(); deletePessoa(p.id); }} disabled={deletingPessoa === p.id} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                                {deletingPessoa === p.id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Trash2 className="w-2.5 h-2.5" />}
                              </button>
                            </div>
                          </div>
                        </div>
                        {isSel && myZonas.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-border/40 flex flex-wrap gap-1">
                            {myZonas.map((z) => (
                              <button key={z.id} onClick={(e) => { e.stopPropagation(); flyToZona(z); }} className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: `${p.cor}22`, color: p.cor }}>{z.nome}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── censo tab ───────────────────────────────────── */}
            {activeTab === "censo" && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="px-3 py-2 border-b border-border/40 shrink-0">
                  <p className="text-xs font-semibold">Censo por zona</p>
                  <p className="text-[10px] text-muted-foreground">Clique para editar</p>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {zonas.map((zona) => {
                    const color = zoneColor(zona, pessoas);
                    const pct   = zona.censo_residencias > 0 ? Math.round((zona.censo_visitados / zona.censo_residencias) * 100) : 0;
                    return (
                      <div key={zona.id} className="border-b border-border/30 px-3 py-3 hover:bg-muted/20 cursor-pointer" onClick={() => editZona(zona)}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                          <span className="text-xs font-semibold truncate">{zona.nome}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1 text-[10px] mb-1.5">
                          {[["Res.", zona.censo_residencias], ["Pop.", zona.censo_populacao], ["Ap.", zona.censo_apoiadores], ["Vis.", zona.censo_visitados]].map(([l, v]) => (
                            <div key={String(l)} className="text-center"><div className="font-bold">{Number(v).toLocaleString()}</div><div className="text-muted-foreground">{l}</div></div>
                          ))}
                        </div>
                        <div className="h-1 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[9px] text-muted-foreground mt-0.5">{pct}% visitado</p>
                      </div>
                    );
                  })}
                </div>
                <div className="px-3 py-2 border-t border-border/40 bg-muted/20 shrink-0">
                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    {[["🏠 Residências", totalRes], ["👥 População", totalPop], ["⭐ Apoiadores", totalAp], ["✅ Visitados", totalVis]].map(([l, v]) => (
                      <div key={String(l)} className="rounded-lg bg-card border border-border/50 px-2 py-1.5">
                        <div className="font-bold text-sm">{Number(v).toLocaleString()}</div>
                        <div className="text-muted-foreground">{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── painel tab ──────────────────────────────────── */}
            {activeTab === "painel" && (
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {[
                  { label: "Zonas mapeadas", value: zonas.length, sub: `${zonas.filter(z => z.responsavel_id).length} com responsável`, icon: Layers, color: "#6366f1" },
                  { label: "Responsáveis",   value: pessoas.length, sub: "", icon: Users, color: "#10b981" },
                  { label: "Residências",    value: totalRes.toLocaleString(), sub: `${totalPop.toLocaleString()} pessoas`, icon: Home, color: "#f59e0b" },
                  { label: "Apoiadores",     value: totalAp.toLocaleString(), sub: `de ${totalPop.toLocaleString()}`, icon: TrendingUp, color: "#22c55e" },
                ].map(({ label, value, sub, icon: Icon, color }) => (
                  <div key={label} className="rounded-xl border border-border/50 bg-card p-3 flex items-start justify-between">
                    <div><p className="text-[10px] text-muted-foreground">{label}</p><p className="text-xl font-black">{value}</p><p className="text-[9px] text-muted-foreground">{sub}</p></div>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}22` }}><Icon className="w-4 h-4" style={{ color }} /></div>
                  </div>
                ))}
                <div className="rounded-xl border border-border/50 bg-card p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Cobertura de visitas</p>
                  <p className="text-xl font-black">{pctVis}%</p>
                  <div className="h-2 rounded-full bg-muted overflow-hidden mt-2">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pctVis}%`, background: pctVis >= 75 ? "#22c55e" : pctVis >= 40 ? "#f59e0b" : "#ef4444" }} />
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-1">{totalVis.toLocaleString()} de {totalRes.toLocaleString()} residências</p>
                </div>
                {pessoas.length > 0 && (
                  <div className="rounded-xl border border-border/50 bg-card p-3">
                    <p className="text-[10px] font-semibold mb-2">Zonas por responsável</p>
                    <div className="space-y-2">
                      {pessoas.map((p) => {
                        const mz = zonas.filter((z) => z.responsavel_id === p.id);
                        const pct2 = zonas.length > 0 ? Math.round((mz.length / zonas.length) * 100) : 0;
                        return (
                          <div key={p.id} className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold shrink-0" style={{ background: p.cor }}>{initials(p.nome)}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between text-[10px] mb-0.5"><span className="font-medium truncate">{p.nome}</span><span className="text-muted-foreground ml-1 shrink-0">{mz.length}</span></div>
                              <div className="h-1 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct2}%`, background: p.cor }} /></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── map section ──────────────────────────────────────── */}
          <div className="flex flex-col flex-1 overflow-hidden">

            {/* ── LAYER BAR (horizontal above map) ──────────────── */}
            <div className="flex items-center gap-3 px-4 py-2 bg-card/95 backdrop-blur border-b border-border/60 z-10 shrink-0 flex-wrap">
              {/* base map selector */}
              <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-1">
                {BASE_OPTS.map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => setActiveBase(id)}
                    className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all",
                      activeBase === id ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground")}>
                    <Icon className="w-3 h-3" />{label}
                  </button>
                ))}
              </div>

              <div className="h-4 w-px bg-border/50" />

              {/* overlay toggles */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {OVERLAY_OPTS.map(({ id, label, icon: Icon, color }) => {
                  const active = activeLayers.has(id);
                  return (
                    <button key={id} onClick={() => toggleLayer(id)}
                      className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all",
                        active ? "border-transparent text-white shadow-sm" : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground bg-card")}
                      style={active ? { background: color } : {}}>
                      <Icon className="w-3 h-3" />{label}
                    </button>
                  );
                })}
              </div>

              {/* selected person badge */}
              {selectedPessoaId && (() => {
                const p = pessoas.find((x) => x.id === selectedPessoaId);
                if (!p) return null;
                return (
                  <div className="ml-auto flex items-center gap-2 bg-card border rounded-lg px-2.5 py-1 shadow-sm">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ background: p.cor }}>{initials(p.nome)}</div>
                    <span className="text-xs font-semibold">{p.nome}</span>
                    <button onClick={() => setSelectedPessoaId(null)} className="text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button>
                  </div>
                );
              })()}
            </div>

            {/* ── map canvas ──────────────────────────────────── */}
            <div className="flex-1 relative overflow-hidden">
              <div ref={containerRef} className="absolute inset-0" />

              {loading && (
                <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-20">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}
              {drawing && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg z-20 pointer-events-none animate-pulse">
                  Modo desenho · {drawPts} pontos · Duplo-clique para fechar
                </div>
              )}

              {/* mini dashboard overlay */}
              <div className="absolute bottom-8 left-3 z-10 flex gap-2 flex-wrap max-w-[220px]">
                {[
                  { label: "Zonas",       value: zonas.length,   color: "#6366f1" },
                  { label: "Pessoas",     value: pessoas.length, color: "#10b981" },
                  { label: "Residências", value: totalRes,       color: "#f59e0b" },
                  { label: `${pctVis}% vis.`, value: totalVis,   color: "#22c55e" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-card/90 backdrop-blur border border-border/50 rounded-lg px-2.5 py-1.5 shadow">
                    <p className="text-[9px] text-muted-foreground">{label}</p>
                    <p className="text-sm font-black" style={{ color }}>{Number(value).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Zona Dialog ────────────────────────────────────────────── */}
      <Dialog open={zonaDialog} onOpenChange={(o) => { if (!o) { setZonaDialog(false); setEditingZonaId(null); drawRef.current = []; } }}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" />{editingZonaId ? "Editar Zona" : "Nova Zona"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2"><Label className="text-xs">Nome *</Label><Input value={zonaForm.nome} onChange={(e) => setZonaForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex: Bairro Centro" className="text-sm" /></div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo</Label>
                <Select value={zonaForm.tipo} onValueChange={(v) => setZonaForm((f) => ({ ...f, tipo: v as ZonaTipo, cor: TIPO_CONFIG[v as ZonaTipo].cor }))}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.entries(TIPO_CONFIG) as [ZonaTipo, { label: string }][]).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Cor</Label><ColorPicker value={zonaForm.cor} onChange={(c) => setZonaForm((f) => ({ ...f, cor: c }))} /></div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Responsável</Label>
              <Select value={zonaForm.responsavel_id || "__none"} onValueChange={(v) => setZonaForm((f) => ({ ...f, responsavel_id: v === "__none" ? "" : v }))}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Sem responsável" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Sem responsável</SelectItem>
                  {pessoas.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full inline-block" style={{ background: p.cor }} />{p.nome}{p.cargo ? ` · ${p.cargo}` : ""}</div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-3">
              <p className="text-xs font-semibold flex items-center gap-1.5"><ClipboardList className="w-3.5 h-3.5 text-primary" /> Dados do Censo</p>
              <div className="grid grid-cols-2 gap-3">
                {([["censo_residencias","Residências 🏠"],["censo_populacao","População 👥"],["censo_apoiadores","Apoiadores ⭐"],["censo_visitados","Visitados ✅"]] as const).map(([field, label]) => (
                  <div key={field} className="space-y-1"><Label className="text-[10px]">{label}</Label><Input value={zonaForm[field]} onChange={(e) => setZonaForm((f) => ({ ...f, [field]: e.target.value.replace(/\D/g,"") }))} inputMode="numeric" className="text-sm" /></div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setZonaDialog(false); setEditingZonaId(null); drawRef.current = []; }}>Cancelar</Button>
            <Button onClick={saveZona} disabled={savingZona || !zonaForm.nome.trim()}>{savingZona ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}{editingZonaId ? "Salvar" : "Criar Zona"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Pessoa Dialog ───────────────────────────────────────────── */}
      <Dialog open={pessoaDialog} onOpenChange={(o) => { if (!o) { setPessoaDialog(false); setEditingPessoaId(null); } }}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><User className="w-4 h-4 text-primary" />{editingPessoaId ? "Editar Responsável" : "Novo Responsável"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-black shadow-lg" style={{ background: pessoaForm.cor }}>
                {pessoaForm.nome ? initials(pessoaForm.nome) : <User className="w-6 h-6" />}
              </div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Nome completo *</Label><Input value={pessoaForm.nome} onChange={(e) => setPessoaForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Nome do responsável" className="text-sm" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs flex items-center gap-1"><Phone className="w-3 h-3" /> Telefone</Label><Input value={pessoaForm.telefone} onChange={(e) => setPessoaForm((f) => ({ ...f, telefone: e.target.value }))} placeholder="(92) 9xxxx-xxxx" className="text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs flex items-center gap-1"><Building2 className="w-3 h-3" /> Cargo</Label><Input value={pessoaForm.cargo} onChange={(e) => setPessoaForm((f) => ({ ...f, cargo: e.target.value }))} placeholder="Líder de zona" className="text-sm" /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs flex items-center gap-1"><Mail className="w-3 h-3" /> E-mail</Label><Input value={pessoaForm.email} onChange={(e) => setPessoaForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" className="text-sm" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Cor identificadora</Label><ColorPicker value={pessoaForm.cor} onChange={(c) => setPessoaForm((f) => ({ ...f, cor: c }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPessoaDialog(false); setEditingPessoaId(null); }}>Cancelar</Button>
            <Button onClick={savePessoa} disabled={savingPessoa || !pessoaForm.nome.trim()}>{savingPessoa ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}{editingPessoaId ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
