import { FileText, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface Movimento {
  id: string;
  tipo: string;
  descricao: string;
  categoria: string;
  valor: number;
  data: string;
  observacao: string;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function buildSummary(movimentos: Movimento[]) {
  const receitas = movimentos.filter(m => m.tipo === "receita");
  const despesas = movimentos.filter(m => m.tipo === "despesa");
  const totalReceitas = receitas.reduce((s, m) => s + Number(m.valor), 0);
  const totalDespesas = despesas.reduce((s, m) => s + Number(m.valor), 0);

  const catMap: Record<string, number> = {};
  despesas.forEach(m => {
    const cat = m.categoria || "Sem categoria";
    catMap[cat] = (catMap[cat] || 0) + Number(m.valor);
  });
  const categories = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

  const now = new Date();
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const r = movimentos.filter(m => m.tipo === "receita" && new Date(m.data + "T00:00:00").getMonth() === d.getMonth() && new Date(m.data + "T00:00:00").getFullYear() === d.getFullYear()).reduce((s, m) => s + Number(m.valor), 0);
    const dp = movimentos.filter(m => m.tipo === "despesa" && new Date(m.data + "T00:00:00").getMonth() === d.getMonth() && new Date(m.data + "T00:00:00").getFullYear() === d.getFullYear()).reduce((s, m) => s + Number(m.valor), 0);
    return { mes: `${MONTH_NAMES[d.getMonth()]}/${d.getFullYear()}`, receitas: r, despesas: dp, saldo: r - dp };
  });

  return { totalReceitas, totalDespesas, saldo: totalReceitas - totalDespesas, categories, monthly };
}

export function exportPDF(movimentos: Movimento[]) {
  const { totalReceitas, totalDespesas, saldo, categories, monthly } = buildSummary(movimentos);
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString("pt-BR");

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Relatório Financeiro do Gabinete", 14, 20);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Gerado em ${today}`, 14, 27);

  // KPIs
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo Financeiro", 14, 38);
  autoTable(doc, {
    startY: 42,
    head: [["Indicador", "Valor"]],
    body: [
      ["Total de Receitas", fmt(totalReceitas)],
      ["Total de Despesas", fmt(totalDespesas)],
      ["Saldo", fmt(saldo)],
      ["Nº de Lançamentos", String(movimentos.length)],
    ],
    theme: "grid",
    headStyles: { fillColor: [34, 87, 49] },
    styles: { fontSize: 9 },
  });

  // Monthly evolution
  let y = (doc as any).lastAutoTable?.finalY + 10 || 90;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Evolução Mensal (Últimos 6 Meses)", 14, y);
  autoTable(doc, {
    startY: y + 4,
    head: [["Mês", "Receitas", "Despesas", "Saldo"]],
    body: monthly.map(m => [m.mes, fmt(m.receitas), fmt(m.despesas), fmt(m.saldo)]),
    theme: "grid",
    headStyles: { fillColor: [34, 87, 49] },
    styles: { fontSize: 9 },
  });

  // Categories
  if (categories.length > 0) {
    y = (doc as any).lastAutoTable?.finalY + 10 || 160;
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Despesas por Categoria", 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [["Categoria", "Valor", "% do Total"]],
      body: categories.map(([cat, val]) => [
        cat,
        fmt(val),
        `${((val / totalDespesas) * 100).toFixed(1)}%`,
      ]),
      theme: "grid",
      headStyles: { fillColor: [34, 87, 49] },
      styles: { fontSize: 9 },
    });
  }

  // Transactions list
  y = (doc as any).lastAutoTable?.finalY + 10 || 200;
  if (y > 230) { doc.addPage(); y = 20; }
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Lançamentos Detalhados", 14, y);
  autoTable(doc, {
    startY: y + 4,
    head: [["Data", "Tipo", "Descrição", "Categoria", "Valor"]],
    body: movimentos.map(m => [
      new Date(m.data + "T00:00:00").toLocaleDateString("pt-BR"),
      m.tipo === "receita" ? "Receita" : "Despesa",
      m.descricao,
      m.categoria || "-",
      (m.tipo === "receita" ? "+" : "-") + fmt(Number(m.valor)),
    ]),
    theme: "grid",
    headStyles: { fillColor: [34, 87, 49] },
    styles: { fontSize: 8 },
  });

  doc.save("relatorio-financeiro.pdf");
}

export function exportExcel(movimentos: Movimento[]) {
  const { totalReceitas, totalDespesas, saldo, categories, monthly } = buildSummary(movimentos);
  const wb = XLSX.utils.book_new();

  // Resumo sheet
  const resumoData = [
    ["Relatório Financeiro do Gabinete"],
    [`Gerado em ${new Date().toLocaleDateString("pt-BR")}`],
    [],
    ["Indicador", "Valor"],
    ["Total de Receitas", totalReceitas],
    ["Total de Despesas", totalDespesas],
    ["Saldo", saldo],
    ["Nº de Lançamentos", movimentos.length],
  ];
  const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

  // Evolução mensal
  const monthlyData = [
    ["Mês", "Receitas", "Despesas", "Saldo"],
    ...monthly.map(m => [m.mes, m.receitas, m.despesas, m.saldo]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(monthlyData), "Evolução Mensal");

  // Categorias
  if (categories.length > 0) {
    const catData = [
      ["Categoria", "Valor", "% do Total"],
      ...categories.map(([cat, val]) => [cat, val, `${((val / totalDespesas) * 100).toFixed(1)}%`]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(catData), "Categorias");
  }

  // Lançamentos
  const lancData = [
    ["Data", "Tipo", "Descrição", "Categoria", "Valor", "Observação"],
    ...movimentos.map(m => [
      new Date(m.data + "T00:00:00").toLocaleDateString("pt-BR"),
      m.tipo === "receita" ? "Receita" : "Despesa",
      m.descricao,
      m.categoria || "",
      Number(m.valor),
      m.observacao || "",
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(lancData), "Lançamentos");

  XLSX.writeFile(wb, "relatorio-financeiro.xlsx");
}

interface Props {
  movimentos: Movimento[];
}

export default function FinancasExportButtons({ movimentos }: Props) {
  const { toast } = useToast();

  const handlePDF = () => {
    exportPDF(movimentos);
    toast({ title: "PDF exportado com sucesso" });
  };

  const handleExcel = () => {
    exportExcel(movimentos);
    toast({ title: "Excel exportado com sucesso" });
  };

  return (
    <div className="flex gap-1.5">
      <Button onClick={handlePDF} variant="outline" size="sm" className="gap-1.5">
        <FileText className="w-4 h-4" /> PDF
      </Button>
      <Button onClick={handleExcel} variant="outline" size="sm" className="gap-1.5">
        <FileSpreadsheet className="w-4 h-4" /> Excel
      </Button>
    </div>
  );
}
