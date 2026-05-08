import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MapPin, Circle, Layers, Trash2, X, Check,
  Users, Activity, Eye, EyeOff, ChevronLeft, ChevronRight,
  PenTool, Target, Loader2, Search, RotateCcw,
} from "lucide-react";

/* ── fix Leaflet default icon with bundlers ───────────────────────── */
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon   from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
(L.Icon.Default.prototype as any)._getIconUrl = undefined;
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow });

/* ── IBGE 2022 — top 50 municípios por população ─────────────────── */
const IBGE_POP = [
  { nome:"São Paulo",          lat:-23.5558, lng:-46.6396, pop:11451245, estado:"SP" },
  { nome:"Rio de Janeiro",     lat:-22.9068, lng:-43.1729, pop:6775561,  estado:"RJ" },
  { nome:"Brasília",           lat:-15.7797, lng:-47.9297, pop:3094325,  estado:"DF" },
  { nome:"Salvador",           lat:-12.9714, lng:-38.5014, pop:2900319,  estado:"BA" },
  { nome:"Fortaleza",          lat:-3.7172,  lng:-38.5434, pop:2703391,  estado:"CE" },
  { nome:"Belo Horizonte",     lat:-19.9191, lng:-43.9386, pop:2315560,  estado:"MG" },
  { nome:"Manaus",             lat:-3.1190,  lng:-60.0217, pop:2063689,  estado:"AM" },
  { nome:"Curitiba",           lat:-25.4284, lng:-49.2733, pop:1948626,  estado:"PR" },
  { nome:"Recife",             lat:-8.0539,  lng:-34.8811, pop:1488920,  estado:"PE" },
  { nome:"Porto Alegre",       lat:-30.0331, lng:-51.2300, pop:1409351,  estado:"RS" },
  { nome:"Goiânia",            lat:-16.6864, lng:-49.2643, pop:1536097,  estado:"GO" },
  { nome:"Belém",              lat:-1.4558,  lng:-48.4902, pop:1499641,  estado:"PA" },
  { nome:"Guarulhos",          lat:-23.4543, lng:-46.5338, pop:1392121,  estado:"SP" },
  { nome:"Campinas",           lat:-22.9056, lng:-47.0608, pop:1213792,  estado:"SP" },
  { nome:"São Luís",           lat:-2.5297,  lng:-44.3028, pop:1108975,  estado:"MA" },
  { nome:"São Gonçalo",        lat:-22.8269, lng:-43.0539, pop:1084839,  estado:"RJ" },
  { nome:"Maceió",             lat:-9.6658,  lng:-35.7350, pop:932748,   estado:"AL" },
  { nome:"Natal",              lat:-5.7945,  lng:-35.2110, pop:890480,   estado:"RN" },
  { nome:"Teresina",           lat:-5.0892,  lng:-42.8019, pop:866300,   estado:"PI" },
  { nome:"Campo Grande",       lat:-20.4697, lng:-54.6201, pop:906092,   estado:"MS" },
  { nome:"Ribeirão Preto",     lat:-21.1767, lng:-47.8208, pop:722429,   estado:"SP" },
  { nome:"João Pessoa",        lat:-7.1153,  lng:-34.8641, pop:817511,   estado:"PB" },
  { nome:"Aracaju",            lat:-10.9472, lng:-37.0731, pop:672823,   estado:"SE" },
  { nome:"Cuiabá",             lat:-15.6014, lng:-56.0979, pop:618124,   estado:"MT" },
  { nome:"Porto Velho",        lat:-8.7612,  lng:-63.9004, pop:539354,   estado:"RO" },
  { nome:"Macapá",             lat:0.0349,   lng:-51.0694, pop:522116,   estado:"AP" },
  { nome:"Boa Vista",          lat:2.8235,   lng:-60.6758, pop:399213,   estado:"RR" },
  { nome:"Palmas",             lat:-10.1753, lng:-48.2982, pop:313329,   estado:"TO" },
  { nome:"Rio Branco",         lat:-9.9754,  lng:-67.8249, pop:407319,   estado:"AC" },
  { nome:"Florianópolis",      lat:-27.5954, lng:-48.5480, pop:537211,   estado:"SC" },
  { nome:"Vitória",            lat:-20.3155, lng:-40.3128, pop:365855,   estado:"ES" },
  { nome:"Maceiò",             lat:-9.6658,  lng:-35.7350, pop:1025360,  estado:"AL" },
  { nome:"São Paulo (Grande)", lat:-23.6821, lng:-46.8754, pop:21571281, estado:"SP" },
];

/* ── tile layers ─────────────────────────────────────────────────── */
const TILE_LAYERS = {
  osm:       { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",                                        attribution: "© OpenStreetMap" },
  carto:     { url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",                            attribution: "© CARTO" },
  satellite: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attribution: "© Esri" },
  dark:      { url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",                             attribution: "© CARTO Dark" },
};

/* ── types ───────────────────────────────────────────────────────── */
type Tool = "select" | "pin" | "radius" | "territory";
type BaseMap = keyof typeof TILE_LAYERS;

interface MapaPonto     { id:string; nome:string; tipo:string; descricao:string; latitude:number; longitude:number; cor:string; }
interface MapaRaio      { id:string; nome:string; latitude:number; longitude:number; raio_km:number; cor:string; descricao:string; }
interface MapaTerritorio{ id:string; nome:string; tipo:string; descricao:string; cor:string; coordenadas:[number,number][]; }

/* ── pin types ───────────────────────────────────────────────────── */
const PIN_TIPOS = [
  { value:"demanda",       label:"Demanda Cidadã",       icon:"📢" },
  { value:"evento",        label:"Local de Evento",      icon:"📅" },
  { value:"lideranca",     label:"Liderança Comunitária", icon:"👤" },
  { value:"apoio",         label:"Ponto de Apoio",       icon:"🏠" },
  { value:"infraestrutura",label:"Infraestrutura",       icon:"🏗" },
  { value:"saude",         label:"Saúde",                icon:"🏥" },
  { value:"educacao",      label:"Educação",             icon:"🏫" },
  { value:"outro",         label:"Outro",                icon:"📌" },
];
const TERR_TIPOS = [
  { value:"bairro",         label:"Bairro" },
  { value:"zona_eleitoral", label:"Zona Eleitoral" },
  { value:"regiao",         label:"Região" },
  { value:"distrito",       label:"Distrito" },
  { value:"area_influencia",label:"Área de Influência" },
];
const COR_OPTIONS = ["#3b82f6","#22c55e","#ef4444","#f59e0b","#8b5cf6","#ec4899","#06b6d4","#f97316"];
const fmtPop = (n:number) => n>=1000000 ? `${(n/1000000).toFixed(1)}M` : n>=1000 ? `${(n/1000).toFixed(0)}K` : String(n);

/* ── helpers ─────────────────────────────────────────────────────── */
function popColor(pop:number):string {
  if (pop >= 3000000) return "#7f1d1d";
  if (pop >= 1000000) return "#dc2626";
  if (pop >= 500000)  return "#f97316";
  if (pop >= 200000)  return "#eab308";
  if (pop >= 100000)  return "#22c55e";
  return "#3b82f6";
}
function popRadius(pop:number):number {
  return 8000 + Math.sqrt(pop) * 0.45;
}
function createCustomIcon(cor:string, emoji:string) {
  return L.divIcon({
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
    html: `<div style="width:30px;height:30px;background:${cor};border:2px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.4)"><span style="transform:rotate(45deg);font-size:13px">${emoji}</span></div>`,
  });
}

/* ═══════════════════════════════════════════════════════════════════ */
export default function Mapa() {
  const { user }    = useAuth();
  const { toast }   = useToast();

  /* map refs */
  const mapRef        = useRef<L.Map | null>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  const tileRef       = useRef<L.TileLayer | null>(null);
  const popLayerRef   = useRef<L.LayerGroup | null>(null);
  const demLayerRef   = useRef<L.LayerGroup | null>(null);
  const pinLayerRef   = useRef<L.LayerGroup | null>(null);
  const raioLayerRef  = useRef<L.LayerGroup | null>(null);
  const terrLayerRef  = useRef<L.LayerGroup | null>(null);
  const vertMarkersRef= useRef<L.Marker[]>([]);
  const tempPolyRef   = useRef<L.Polygon | null>(null);

  /* data */
  const [pontos,     setPontos]     = useState<MapaPonto[]>([]);
  const [raios,      setRaios]      = useState<MapaRaio[]>([]);
  const [territorios,setTerritorios]= useState<MapaTerritorio[]>([]);

  /* UI state */
  const [loading,      setLoading]      = useState(true);
  const [tool,         setTool]         = useState<Tool>("select");
  const [panelOpen,    setPanelOpen]    = useState(true);
  const [baseMap,      setBaseMap]      = useState<BaseMap>("carto");
  const [searchQuery,  setSearchQuery]  = useState("");
  const [searchRes,    setSearchRes]    = useState<any[]>([]);
  const [searching,    setSearching]    = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{type:"ponto"|"raio"|"territorio";id:string}|null>(null);

  /* layer visibility */
  const [layerVis, setLayerVis] = useState({
    populacao: true,
    demografia: false,
    pins: true,
    raios: true,
    territorios: true,
  });

  /* territory drawing */
  const [vertices,     setVertices]     = useState<[number,number][]>([]);
  const [drawingTerritory, setDrawingTerritory] = useState(false);

  /* pending click coords for dialogs */
  const [pendingCoords, setPendingCoords] = useState<{lat:number;lng:number}|null>(null);

  /* dialogs */
  const [pinDialog,  setPinDialog]  = useState(false);
  const [raioDialog, setRaioDialog] = useState(false);
  const [terrDialog, setTerrDialog] = useState(false);
  const [saving,     setSaving]     = useState(false);

  /* forms */
  const [pinForm,  setPinForm]  = useState({ nome:"", tipo:"outro", descricao:"", cor:"#3b82f6" });
  const [raioForm, setRaioForm] = useState({ nome:"", raio_km:"5", cor:"#3b82f6", descricao:"" });
  const [terrForm, setTerrForm] = useState({ nome:"", tipo:"regiao", descricao:"", cor:"#6366f1" });

  /* ── load data ──────────────────────────────────────────────────── */
  const loadData = useCallback(async () => {
    const [pr, rr, tr] = await Promise.all([
      supabase.from("mapa_pontos").select("*").order("created_at", { ascending:false }),
      supabase.from("mapa_raios").select("*").order("created_at", { ascending:false }),
      supabase.from("mapa_territorios").select("*").order("created_at", { ascending:false }),
    ]);
    setPontos((pr.data as MapaPonto[]) || []);
    setRaios((rr.data as MapaRaio[]) || []);
    setTerritorios((tr.data as MapaTerritorio[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── init map ───────────────────────────────────────────────────── */
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = L.map(containerRef.current, {
      center: [-15.0, -52.0],
      zoom: 5,
      zoomControl: true,
    });

    tileRef.current = L.tileLayer(TILE_LAYERS.carto.url, { attribution: TILE_LAYERS.carto.attribution, maxZoom: 19 }).addTo(map);
    popLayerRef.current  = L.layerGroup().addTo(map);
    demLayerRef.current  = L.layerGroup();
    pinLayerRef.current  = L.layerGroup().addTo(map);
    raioLayerRef.current = L.layerGroup().addTo(map);
    terrLayerRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;

    /* build population layer */
    const maxPop = Math.max(...IBGE_POP.map(c => c.pop));
    IBGE_POP.forEach(city => {
      const color  = popColor(city.pop);
      const radius = popRadius(city.pop);
      const circle = L.circle([city.lat, city.lng], {
        radius, color, fillColor: color, fillOpacity: 0.35, weight: 1,
      });
      circle.bindPopup(`
        <div style="min-width:160px;font-family:sans-serif">
          <b style="font-size:13px">${city.nome} — ${city.estado}</b><br>
          <span style="font-size:11px;color:#6b7280">População 2022:</span>
          <b style="font-size:12px"> ${city.pop.toLocaleString("pt-BR")}</b>
        </div>`);
      popLayerRef.current?.addLayer(circle);

      /* demographic: city label marker */
      const demMarker = L.circleMarker([city.lat, city.lng], {
        radius: 5, color: color, fillColor: color, fillOpacity: 0.8, weight: 1.5,
      });
      demMarker.bindTooltip(`${city.nome}<br><b>${fmtPop(city.pop)}</b>`, { permanent: false, className: "leaflet-tooltip-dem" });
      demLayerRef.current?.addLayer(demMarker);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  /* ── click handler (depends on tool) ───────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      if (tool === "pin") {
        setPendingCoords({ lat, lng });
        setPinForm({ nome:"", tipo:"outro", descricao:"", cor:"#3b82f6" });
        setPinDialog(true);
        return;
      }
      if (tool === "radius") {
        setPendingCoords({ lat, lng });
        setRaioForm({ nome:"", raio_km:"5", cor:"#3b82f6", descricao:"" });
        setRaioDialog(true);
        return;
      }
      if (tool === "territory") {
        const newVerts = [...vertices, [lat, lng] as [number,number]];
        setVertices(newVerts);

        /* add vertex marker */
        const vm = L.circleMarker([lat, lng], { radius:6, color:"#6366f1", fillColor:"#6366f1", fillOpacity:1, weight:2 });
        vm.addTo(map);
        vertMarkersRef.current.push(vm);

        /* redraw temp polygon */
        if (tempPolyRef.current) { tempPolyRef.current.remove(); tempPolyRef.current = null; }
        if (newVerts.length >= 3) {
          tempPolyRef.current = L.polygon(newVerts, { color:"#6366f1", fillColor:"#6366f1", fillOpacity:0.2, dashArray:"5,5", weight:2 }).addTo(map);
        } else if (newVerts.length === 2) {
          tempPolyRef.current = L.polyline(newVerts, { color:"#6366f1", dashArray:"5,5", weight:2 }).addTo(map) as unknown as L.Polygon;
        }
      }
    };

    map.on("click", handleClick);
    return () => { map.off("click", handleClick); };
  }, [tool, vertices]);

  /* cursor style per tool */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const cursors: Record<Tool, string> = { select:"grab", pin:"crosshair", radius:"crosshair", territory:"crosshair" };
    container.style.cursor = cursors[tool];
  }, [tool]);

  /* ── layer visibility ───────────────────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (layerVis.populacao)  popLayerRef.current?.addTo(map);  else popLayerRef.current?.remove();
    if (layerVis.demografia) demLayerRef.current?.addTo(map);  else demLayerRef.current?.remove();
    if (layerVis.pins)       pinLayerRef.current?.addTo(map);  else pinLayerRef.current?.remove();
    if (layerVis.raios)      raioLayerRef.current?.addTo(map); else raioLayerRef.current?.remove();
    if (layerVis.territorios)terrLayerRef.current?.addTo(map); else terrLayerRef.current?.remove();
  }, [layerVis]);

  /* ── base map switching ─────────────────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !tileRef.current) return;
    tileRef.current.remove();
    const cfg = TILE_LAYERS[baseMap];
    tileRef.current = L.tileLayer(cfg.url, { attribution: cfg.attribution, maxZoom: 19 });
    tileRef.current.addTo(map);
    tileRef.current.bringToBack();
  }, [baseMap]);

  /* ── render pins layer ──────────────────────────────────────────── */
  useEffect(() => {
    const layer = pinLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    pontos.forEach(p => {
      const tipoInfo = PIN_TIPOS.find(t => t.value === p.tipo) || PIN_TIPOS[PIN_TIPOS.length-1];
      const icon = createCustomIcon(p.cor, tipoInfo.icon);
      const marker = L.marker([p.latitude, p.longitude], { icon });
      marker.bindPopup(`
        <div style="min-width:160px;font-family:sans-serif;padding:2px">
          <p style="font-weight:700;font-size:13px;margin:0 0 4px">${tipoInfo.icon} ${p.nome}</p>
          <p style="font-size:11px;color:#6b7280;margin:0 0 2px">${tipoInfo.label}</p>
          ${p.descricao ? `<p style="font-size:11px;color:#4b5563;margin:3px 0;font-style:italic">${p.descricao}</p>` : ""}
        </div>`);
      layer.addLayer(marker);
    });
  }, [pontos]);

  /* ── render raios layer ─────────────────────────────────────────── */
  useEffect(() => {
    const layer = raioLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    raios.forEach(r => {
      const circle = L.circle([r.latitude, r.longitude], {
        radius: r.raio_km * 1000,
        color: r.cor, fillColor: r.cor, fillOpacity: 0.12, weight: 2, dashArray: "6,4",
      });
      const center = L.circleMarker([r.latitude, r.longitude], { radius:5, color:r.cor, fillColor:r.cor, fillOpacity:1, weight:2 });
      circle.bindPopup(`<b>${r.nome}</b><br><span style="font-size:11px;color:#6b7280">Raio: ${r.raio_km} km</span>${r.descricao?`<br><span style="font-size:11px">${r.descricao}</span>`:""}`);
      center.bindTooltip(r.nome);
      layer.addLayer(circle);
      layer.addLayer(center);
    });
  }, [raios]);

  /* ── render territories layer ───────────────────────────────────── */
  useEffect(() => {
    const layer = terrLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    territorios.forEach(t => {
      if (!t.coordenadas || t.coordenadas.length < 3) return;
      const poly = L.polygon(t.coordenadas, { color:t.cor, fillColor:t.cor, fillOpacity:0.18, weight:2.5 });
      poly.bindPopup(`<b>${t.nome}</b><br><span style="font-size:11px;color:#6b7280">${TERR_TIPOS.find(tt=>tt.value===t.tipo)?.label||t.tipo}</span>${t.descricao?`<br><span style="font-size:11px">${t.descricao}</span>`:""}`);
      layer.addLayer(poly);
    });
  }, [territorios]);

  /* ── search ─────────────────────────────────────────────────────── */
  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchRes([]);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=br&limit=6`);
      const data = await res.json();
      setSearchRes(data);
    } catch { toast({ title:"Erro na busca", variant:"destructive" }); }
    setSearching(false);
  };

  const goToResult = (r:any) => {
    mapRef.current?.setView([Number(r.lat), Number(r.lon)], 14, { animate:true });
    setSearchRes([]);
    setSearchQuery("");
  };

  /* ── save pin ───────────────────────────────────────────────────── */
  const savePinto = async () => {
    if (!pendingCoords || !pinForm.nome.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("mapa_pontos").insert({
      nome: pinForm.nome.trim(), tipo: pinForm.tipo, descricao: pinForm.descricao,
      latitude: pendingCoords.lat, longitude: pendingCoords.lng,
      cor: pinForm.cor, user_id: user?.user_id,
    });
    setSaving(false);
    if (error) { toast({ title:"Erro ao salvar pin", variant:"destructive" }); return; }
    toast({ title:"Pin adicionado!" });
    setPinDialog(false);
    loadData();
  };

  /* ── save raio ──────────────────────────────────────────────────── */
  const saveRaio = async () => {
    if (!pendingCoords || !raioForm.nome.trim()) return;
    const km = parseFloat(raioForm.raio_km);
    if (isNaN(km) || km <= 0) { toast({ title:"Raio inválido", variant:"destructive" }); return; }
    setSaving(true);
    const { error } = await supabase.from("mapa_raios").insert({
      nome: raioForm.nome.trim(), latitude: pendingCoords.lat, longitude: pendingCoords.lng,
      raio_km: km, cor: raioForm.cor, descricao: raioForm.descricao, user_id: user?.user_id,
    });
    setSaving(false);
    if (error) { toast({ title:"Erro ao salvar raio", variant:"destructive" }); return; }
    toast({ title:`Raio de ${km}km adicionado!` });
    setRaioDialog(false);
    loadData();
  };

  /* ── finish territory ───────────────────────────────────────────── */
  const finishTerritory = () => {
    if (vertices.length < 3) { toast({ title:"Desenhe pelo menos 3 pontos", variant:"destructive" }); return; }
    setTerrForm({ nome:"", tipo:"regiao", descricao:"", cor:"#6366f1" });
    setTerrDialog(true);
  };

  const saveTerritory = async () => {
    if (!terrForm.nome.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("mapa_territorios").insert({
      nome: terrForm.nome.trim(), tipo: terrForm.tipo, descricao: terrForm.descricao,
      cor: terrForm.cor, coordenadas: vertices, user_id: user?.user_id,
    });
    setSaving(false);
    if (error) { toast({ title:"Erro ao salvar território", variant:"destructive" }); return; }
    toast({ title:"Território criado!" });
    setTerrDialog(false);
    clearTempDraw();
    loadData();
  };

  const clearTempDraw = () => {
    vertMarkersRef.current.forEach(m => m.remove());
    vertMarkersRef.current = [];
    if (tempPolyRef.current) { tempPolyRef.current.remove(); tempPolyRef.current = null; }
    setVertices([]);
  };

  /* ── delete ─────────────────────────────────────────────────────── */
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const tableMap = { ponto:"mapa_pontos", raio:"mapa_raios", territorio:"mapa_territorios" } as const;
    const table = deleteTarget.type === "ponto" ? tableMap.ponto : deleteTarget.type === "raio" ? tableMap.raio : tableMap.territorio;
    await supabase.from(table).delete().eq("id", deleteTarget.id);
    toast({ title:"Removido" });
    setDeleteTarget(null);
    loadData();
  };

  /* ── render ─────────────────────────────────────────────────────── */
  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)] -m-6 overflow-hidden">

        {/* ── TOOLBAR ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-3 py-2 bg-card border-b border-border/60 z-10 shrink-0 flex-wrap">
          {/* Tool buttons */}
          <div className="flex items-center rounded-lg border border-border/60 bg-muted/40 p-0.5 gap-0">
            {([
              { t:"select" as Tool,    Icon:Layers,   label:"Selecionar"  },
              { t:"pin" as Tool,       Icon:MapPin,   label:"Adicionar Pin" },
              { t:"radius" as Tool,    Icon:Circle,   label:"Desenhar Raio" },
              { t:"territory" as Tool, Icon:PenTool,  label:"Desenhar Território" },
            ]).map(({ t, Icon, label }) => (
              <button key={t} title={label} onClick={() => { setTool(t); if(t!=="territory") clearTempDraw(); }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${tool===t?"bg-background text-foreground shadow-sm":"text-muted-foreground hover:text-foreground"}`}>
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>

          {/* Territory controls */}
          {tool === "territory" && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground bg-purple-500/10 text-purple-600 px-2 py-1 rounded-md">
                {vertices.length} pontos — clique no mapa para desenhar
              </span>
              {vertices.length >= 3 && (
                <Button size="sm" onClick={finishTerritory} className="h-7 gap-1 text-xs">
                  <Check className="w-3 h-3" />Finalizar Território
                </Button>
              )}
              {vertices.length > 0 && (
                <Button size="sm" variant="outline" onClick={clearTempDraw} className="h-7 gap-1 text-xs">
                  <RotateCcw className="w-3 h-3" />Limpar
                </Button>
              )}
            </div>
          )}

          {/* Search */}
          <div className="relative flex items-center gap-1 ml-auto">
            <Input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleSearch()}
              placeholder="Buscar município, endereço..." className="h-8 w-56 text-xs" />
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={handleSearch} disabled={searching}>
              {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            </Button>
            {searchRes.length > 0 && (
              <div className="absolute top-full right-0 mt-1 w-80 bg-card border border-border rounded-xl shadow-xl z-[3000] max-h-52 overflow-y-auto">
                {searchRes.map((r,i) => (
                  <button key={i} onClick={() => goToResult(r)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors">
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-xs truncate">{r.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── MAP + PANEL ─────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden relative">

          {/* Map */}
          <div className="flex-1 relative">
            {loading && (
              <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-background/80">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}
            <div ref={containerRef} className="w-full h-full" />
          </div>

          {/* Panel toggle tab */}
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-[1000] w-6 bg-card border border-r-0 border-border/60 rounded-l-lg py-6 flex flex-col items-center justify-center text-muted-foreground hover:text-foreground transition-colors shadow-sm"
            style={{ right: panelOpen ? "320px" : "0" }}
          >
            {panelOpen ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>

          {/* Side Panel */}
          {panelOpen && (
            <div className="w-80 bg-card border-l border-border/60 flex flex-col overflow-hidden shrink-0">
              <div className="overflow-y-auto flex-1 p-3 space-y-4">

                {/* Mapa base */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Mapa Base</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(Object.entries(TILE_LAYERS) as [BaseMap, any][]).map(([key]) => (
                      <button key={key} onClick={() => setBaseMap(key)}
                        className={`text-xs px-2 py-1.5 rounded-lg border transition-all ${baseMap===key?"bg-primary/10 border-primary/40 text-primary font-medium":"border-border/50 text-muted-foreground hover:border-border"}`}>
                        {{ osm:"OpenStreetMap", carto:"Mapa Limpo", satellite:"Satélite", dark:"Escuro" }[key]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Camadas */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Camadas</p>
                  <div className="space-y-1.5">
                    {([
                      { key:"populacao"  as const, label:"Densidade Populacional", icon:Users,    color:"text-rose-500"   },
                      { key:"demografia" as const, label:"Dados Demográficos",     icon:Activity, color:"text-blue-500"   },
                      { key:"pins"       as const, label:"Pins / Marcadores",       icon:MapPin,   color:"text-amber-500"  },
                      { key:"raios"      as const, label:"Raios (Azul)",            icon:Circle,   color:"text-blue-500"   },
                      { key:"territorios"as const, label:"Territórios",            icon:Target,   color:"text-purple-500" },
                    ]).map(({ key, label, icon: Icon, color }) => (
                      <button key={key}
                        onClick={() => setLayerVis(v => ({ ...v, [key]: !v[key] }))}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all ${layerVis[key]?"bg-muted/50 border-border/50":"border-transparent text-muted-foreground/60"}`}>
                        <Icon className={`w-3.5 h-3.5 ${layerVis[key]?color:"text-muted-foreground/40"}`} />
                        <span className="text-xs font-medium flex-1 text-left">{label}</span>
                        {layerVis[key] ? <Eye className="w-3 h-3 text-muted-foreground" /> : <EyeOff className="w-3 h-3 text-muted-foreground/40" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Legenda pop */}
                {layerVis.populacao && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Legenda — População</p>
                    <div className="space-y-1">
                      {[
                        { label:"+ 3M hab.",   color:"#7f1d1d" },
                        { label:"1M–3M hab.",  color:"#dc2626" },
                        { label:"500K–1M",     color:"#f97316" },
                        { label:"200K–500K",   color:"#eab308" },
                        { label:"100K–200K",   color:"#22c55e" },
                        { label:"< 100K",      color:"#3b82f6" },
                      ].map(l => (
                        <div key={l.label} className="flex items-center gap-2">
                          <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: l.color, opacity: 0.8 }} />
                          <span className="text-[11px] text-muted-foreground">{l.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pins list */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pins ({pontos.length})</p>
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {pontos.length === 0 && <p className="text-[11px] text-muted-foreground/50 italic text-center py-2">Nenhum pin adicionado</p>}
                    {pontos.map(p => {
                      const ti = PIN_TIPOS.find(t => t.value === p.tipo) || PIN_TIPOS[PIN_TIPOS.length-1];
                      return (
                        <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group">
                          <span className="text-sm">{ti.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{p.nome}</p>
                            <p className="text-[10px] text-muted-foreground">{ti.label}</p>
                          </div>
                          <button onClick={() => { mapRef.current?.setView([p.latitude, p.longitude], 16, { animate:true }); }} className="p-1 hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
                            <Target className="w-3 h-3" />
                          </button>
                          <button onClick={() => setDeleteTarget({ type:"ponto", id:p.id })} className="p-1 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Raios list */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Raios ({raios.length})</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {raios.length === 0 && <p className="text-[11px] text-muted-foreground/50 italic text-center py-2">Nenhum raio adicionado</p>}
                    {raios.map(r => (
                      <div key={r.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-blue-500/5 border border-blue-500/20 group">
                        <div className="w-3.5 h-3.5 rounded-full border-2 shrink-0" style={{ borderColor: r.cor }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{r.nome}</p>
                          <p className="text-[10px] text-muted-foreground">{r.raio_km} km</p>
                        </div>
                        <button onClick={() => { mapRef.current?.setView([r.latitude, r.longitude], 12, { animate:true }); }} className="p-1 hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
                          <Target className="w-3 h-3" />
                        </button>
                        <button onClick={() => setDeleteTarget({ type:"raio", id:r.id })} className="p-1 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Territórios list */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Territórios ({territorios.length})</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {territorios.length === 0 && <p className="text-[11px] text-muted-foreground/50 italic text-center py-2">Nenhum território criado</p>}
                    {territorios.map(t => (
                      <div key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/30 group">
                        <div className="w-3.5 h-3.5 rounded shrink-0" style={{ backgroundColor: t.cor, opacity: 0.7 }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{t.nome}</p>
                          <p className="text-[10px] text-muted-foreground">{TERR_TIPOS.find(tt=>tt.value===t.tipo)?.label||t.tipo} · {t.coordenadas.length} pontos</p>
                        </div>
                        <button onClick={() => setDeleteTarget({ type:"territorio", id:t.id })} className="p-1 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── PIN DIALOG ────────────────────────────────────────────── */}
      <Dialog open={pinDialog} onOpenChange={o => { if(!o) setPinDialog(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" />Novo Pin</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome *</Label>
              <Input value={pinForm.nome} onChange={e=>setPinForm({...pinForm,nome:e.target.value})} placeholder="Ex: Escola Municipal João XXIII" className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select value={pinForm.tipo} onValueChange={v=>setPinForm({...pinForm,tipo:v})}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PIN_TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Textarea value={pinForm.descricao} onChange={e=>setPinForm({...pinForm,descricao:e.target.value})} rows={2} className="text-sm resize-none" placeholder="Observações sobre este ponto..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cor do marcador</Label>
              <div className="flex gap-2 flex-wrap">
                {COR_OPTIONS.map(c => (
                  <button key={c} onClick={()=>setPinForm({...pinForm,cor:c})}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${pinForm.cor===c?"border-foreground scale-110":"border-transparent hover:scale-105"}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            {pendingCoords && (
              <p className="text-[10px] text-muted-foreground bg-muted/40 px-2 py-1 rounded">
                📍 {pendingCoords.lat.toFixed(5)}, {pendingCoords.lng.toFixed(5)}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setPinDialog(false)}>Cancelar</Button>
            <Button onClick={savePinto} disabled={saving||!pinForm.nome.trim()}>
              {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}Salvar Pin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── RAIO DIALOG ───────────────────────────────────────────── */}
      <Dialog open={raioDialog} onOpenChange={o => { if(!o) setRaioDialog(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Circle className="w-4 h-4 text-blue-500" />Novo Raio de Cobertura</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome *</Label>
              <Input value={raioForm.nome} onChange={e=>setRaioForm({...raioForm,nome:e.target.value})} placeholder="Ex: Área de Influência — Zona Norte" className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Raio em quilômetros *</Label>
              <div className="flex items-center gap-2">
                <Input type="number" min="0.1" step="0.5" value={raioForm.raio_km} onChange={e=>setRaioForm({...raioForm,raio_km:e.target.value})} className="text-sm" />
                <span className="text-sm text-muted-foreground shrink-0">km</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Textarea value={raioForm.descricao} onChange={e=>setRaioForm({...raioForm,descricao:e.target.value})} rows={2} className="text-sm resize-none" placeholder="Para que serve este raio?" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cor do raio</Label>
              <div className="flex gap-2 flex-wrap">
                {COR_OPTIONS.map(c => (
                  <button key={c} onClick={()=>setRaioForm({...raioForm,cor:c})}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${raioForm.cor===c?"border-foreground scale-110":"border-transparent hover:scale-105"}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            {pendingCoords && (
              <p className="text-[10px] text-muted-foreground bg-muted/40 px-2 py-1 rounded">
                📍 Centro: {pendingCoords.lat.toFixed(5)}, {pendingCoords.lng.toFixed(5)}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setRaioDialog(false)}>Cancelar</Button>
            <Button onClick={saveRaio} disabled={saving||!raioForm.nome.trim()}>
              {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}Salvar Raio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── TERRITÓRIO DIALOG ─────────────────────────────────────── */}
      <Dialog open={terrDialog} onOpenChange={o => { if(!o) { setTerrDialog(false); clearTempDraw(); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Target className="w-4 h-4 text-purple-500" />Novo Território</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-xs text-muted-foreground bg-purple-500/10 text-purple-600 px-3 py-2 rounded-lg">{vertices.length} pontos desenhados</p>
            <div className="space-y-1.5">
              <Label className="text-xs">Nome *</Label>
              <Input value={terrForm.nome} onChange={e=>setTerrForm({...terrForm,nome:e.target.value})} placeholder="Ex: Zona Eleitoral 15 — Bairro Centro" className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select value={terrForm.tipo} onValueChange={v=>setTerrForm({...terrForm,tipo:v})}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TERR_TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Textarea value={terrForm.descricao} onChange={e=>setTerrForm({...terrForm,descricao:e.target.value})} rows={2} className="text-sm resize-none" placeholder="Descreva este território..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cor do território</Label>
              <div className="flex gap-2 flex-wrap">
                {COR_OPTIONS.map(c => (
                  <button key={c} onClick={()=>setTerrForm({...terrForm,cor:c})}
                    className={`w-7 h-7 rounded-lg border-2 transition-transform ${terrForm.cor===c?"border-foreground scale-110":"border-transparent hover:scale-105"}`}
                    style={{ backgroundColor: c, opacity: 0.8 }} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>{ setTerrDialog(false); clearTempDraw(); }}>Cancelar</Button>
            <Button onClick={saveTerritory} disabled={saving||!terrForm.nome.trim()}>
              {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}Salvar Território
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRM ────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover item do mapa?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
