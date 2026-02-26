import { useEffect, useState, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import CampanhaLayout from "@/components/campanha/CampanhaLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

const getColor = (pct: number) => {
  if (pct >= 40) return "#16a34a";
  if (pct >= 25) return "#1e40af";
  if (pct >= 10) return "#eab308";
  return "#dc2626";
};

const CampanhaMapa = () => {
  const [calhas, setCalhas] = useState<Calha[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("campanha_calhas").select("*").order("nome");
      setCalhas((data as Calha[]) || []);
      setLoading(false);
    };
    load();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current).setView([-3.1, -60.0], 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when calhas change
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const calhasComCoord = calhas.filter((c) => c.latitude != null && c.longitude != null);
    const maxVotos = Math.max(...calhasComCoord.map((c) => c.potencial_votos), 1);

    // Clear existing layers (except tile layer)
    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker) map.removeLayer(layer);
    });

    calhasComCoord.forEach((c) => {
      const radius = 8 + (c.potencial_votos / maxVotos) * 22;
      const marker = L.circleMarker([Number(c.latitude), Number(c.longitude)], {
        radius,
        fillColor: getColor(Number(c.percentual_cristaos)),
        fillOpacity: 0.7,
        color: "#333",
        weight: 1,
      }).addTo(map);

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
    });

    if (calhasComCoord.length > 0) {
      const bounds = L.latLngBounds(calhasComCoord.map((c) => [Number(c.latitude), Number(c.longitude)] as [number, number]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
    }
  }, [calhas]);

  const calhasSemCoord = calhas.filter((c) => c.latitude === null || c.longitude === null);
  const calhasComCoord = calhas.filter((c) => c.latitude !== null && c.longitude !== null);

  return (
    <CampanhaLayout title="Mapa Eleitoral">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div ref={containerRef} className="h-[500px] lg:h-[600px] rounded-lg" />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-semibold">Legenda</p>
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

          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">
                Total no mapa: <span className="font-semibold text-foreground">{calhasComCoord.length}</span> de {calhas.length} calhas
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </CampanhaLayout>
  );
};

export default CampanhaMapa;
