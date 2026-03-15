import { Button } from "@/components/ui/button";
import { CheckCircle, Star, BookOpen, Heart, Sparkles, ArrowRight } from "lucide-react";

const CHECKOUT_URL = "https://payment.ticto.app/ODABC0D60?pid=AFF749A8D5";

const beneficios = [
  "Orações simples e lindas para crianças de todas as idades",
  "Linguagem acessível e amorosa para pequenos corações",
  "Momentos de fé que fortalecem o vínculo entre pais e filhos",
  "Mais de 30 orações para diferentes situações do dia a dia",
  "Ideal para antes de dormir, refeições e momentos especiais",
  "Formato digital — acesso imediato após a compra",
];

const oQueInclui = [
  { icon: "🌅", titulo: "Orações Matinais", desc: "Para começar o dia com gratidão e alegria" },
  { icon: "🍽️", titulo: "Orações de Refeição", desc: "Ensinando agradecimento na mesa em família" },
  { icon: "🌙", titulo: "Orações Noturnas", desc: "Para encerrar o dia com paz e proteção" },
  { icon: "💛", titulo: "Orações de Gratidão", desc: "Cultivando um coração grato desde cedo" },
  { icon: "🙏", titulo: "Orações de Perdão", desc: "Ensinando sobre reconciliação e amor" },
  { icon: "✨", titulo: "Orações Especiais", desc: "Para aniversários, doenças e momentos únicos" },
];

const depoimentos = [
  {
    nome: "Ana Paula",
    texto: "Minha filha de 5 anos ama! Ela mesma pede para ler uma oração antes de dormir. Transformou nossa rotina noturna.",
    estrelas: 5,
  },
  {
    nome: "Marcos e Júlia",
    texto: "Finalmente encontrei algo na linguagem dela. As orações são encantadoras e ela entende cada palavra.",
    estrelas: 5,
  },
  {
    nome: "Fernanda",
    texto: "Presente perfeito! Dei para minha sobrinha de 7 anos e ela ficou apaixonada. Recomendo demais!",
    estrelas: 5,
  },
];

export default function EbookVendas() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 font-sans">

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 text-white">
        <div className="absolute inset-0 opacity-10">
          {["✨","🌟","💛","🙏","⭐","✝️"].map((e, i) => (
            <span
              key={i}
              className="absolute text-4xl select-none"
              style={{ top: `${10 + i * 14}%`, left: `${5 + i * 15}%`, transform: `rotate(${i * 20}deg)` }}
            >
              {e}
            </span>
          ))}
        </div>

        <div className="relative max-w-4xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6 text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            <span>Ebook Digital — Acesso Imediato</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 leading-tight drop-shadow-sm">
            Guia de Oração<br />
            <span className="text-yellow-200">para Crianças</span> 🙏
          </h1>

          <p className="text-lg md:text-xl mb-8 text-white/90 max-w-2xl mx-auto leading-relaxed">
            Ensine seus filhos a conversar com Deus de forma simples, carinhosa e inesquecível.
            Orações que tocam o coração das crianças e fortalecem a família na fé.
          </p>

          {/* Imagem placeholder */}
          <div className="mx-auto mb-8 w-48 h-64 md:w-56 md:h-72 bg-white/20 rounded-2xl border-4 border-white/40 flex flex-col items-center justify-center shadow-2xl">
            <BookOpen className="w-16 h-16 text-white/60 mb-2" />
            <span className="text-white/60 text-xs text-center px-4">Capa do Ebook<br />(será inserida em breve)</span>
          </div>

          <a href={CHECKOUT_URL} target="_blank" rel="noopener noreferrer">
            <Button size="lg" className="bg-white text-orange-500 hover:bg-yellow-50 font-extrabold text-lg px-10 py-6 rounded-full shadow-xl hover:scale-105 transition-transform">
              QUERO O GUIA AGORA <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </a>

          <p className="mt-4 text-white/70 text-sm">
            Por apenas <strong className="text-yellow-200 text-xl">R$ 49,90</strong> — pagamento 100% seguro
          </p>
        </div>
      </section>

      {/* BENEFÍCIOS */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800 mb-3">
            Por que você vai <span className="text-orange-500">amar</span> esse guia?
          </h2>
          <p className="text-gray-500 text-lg">Tudo pensado com carinho para a fé dos seus filhos</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {beneficios.map((b, i) => (
            <div key={i} className="flex items-start gap-3 bg-white rounded-2xl p-5 shadow-sm border border-orange-100">
              <CheckCircle className="w-6 h-6 text-orange-400 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700 leading-relaxed">{b}</span>
            </div>
          ))}
        </div>
      </section>

      {/* O QUE INCLUI */}
      <section className="bg-gradient-to-r from-orange-100 to-amber-100 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800 mb-3">
              O que está dentro do guia? 📖
            </h2>
            <p className="text-gray-500 text-lg">Conteúdo completo para cada momento do dia</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {oQueInclui.map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 text-center shadow-sm border border-orange-100 hover:shadow-md transition-shadow">
                <div className="text-5xl mb-3">{item.icon}</div>
                <h3 className="font-bold text-gray-800 text-lg mb-2">{item.titulo}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800 mb-3">
            O que as famílias dizem ❤️
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {depoimentos.map((d, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-orange-100">
              <div className="flex gap-1 mb-3">
                {Array.from({ length: d.estrelas }).map((_, s) => (
                  <Star key={s} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-4 italic">"{d.texto}"</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-200 flex items-center justify-center text-orange-600 font-bold text-sm">
                  {d.nome[0]}
                </div>
                <span className="font-semibold text-gray-700 text-sm">{d.nome}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="bg-gradient-to-br from-orange-500 to-rose-500 text-white py-16">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <Heart className="w-12 h-12 mx-auto mb-4 text-pink-200" />
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4 leading-tight">
            Plante a semente da fé<br />no coração do seu filho hoje
          </h2>
          <p className="text-white/80 text-lg mb-8 leading-relaxed">
            Uma pequena oração por dia pode transformar a vida do seu filho para sempre.
            Comece agora com o Guia de Oração para Crianças.
          </p>

          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-8 inline-block">
            <p className="text-white/70 text-sm mb-1">Investimento único</p>
            <p className="text-5xl font-extrabold text-yellow-200">R$ 49,90</p>
            <p className="text-white/70 text-sm mt-1">Acesso imediato • Download em PDF</p>
          </div>

          <div className="block">
            <a href={CHECKOUT_URL} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="bg-yellow-300 text-orange-700 hover:bg-yellow-200 font-extrabold text-xl px-12 py-7 rounded-full shadow-2xl hover:scale-105 transition-transform w-full md:w-auto">
                GARANTIR MEU EXEMPLAR 🙏
              </Button>
            </a>
            <p className="mt-4 text-white/60 text-sm">
              🔒 Pagamento 100% seguro • Satisfação garantida
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-800 text-gray-400 py-8 text-center text-sm">
        <p>© {new Date().getFullYear()} Guia de Oração para Crianças. Todos os direitos reservados.</p>
        <p className="mt-1">Este produto é um ebook digital entregue via download após o pagamento.</p>
      </footer>
    </div>
  );
}
