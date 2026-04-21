const TermosUso = () => (
  <div className="min-h-screen bg-background p-6 sm:p-12 max-w-4xl mx-auto">
    <h1 className="text-3xl font-bold text-foreground mb-6">Termos de Uso</h1>
    <p className="text-sm text-muted-foreground mb-8">Última atualização: 21 de fevereiro de 2026</p>

    <div className="space-y-6 text-sm text-foreground/80 leading-relaxed">
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-2">1. Aceitação dos Termos</h2>
        <p>Ao acessar e utilizar o sistema Gestão Inteligente – Gabinete Digital ("Plataforma"), você concorda integralmente com estes Termos de Uso. Caso não concorde, não utilize a Plataforma.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-2">2. Descrição do Serviço</h2>
        <p>A Plataforma é um sistema de gestão interna que oferece funcionalidades de:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Gestão de pessoas e contatos;</li>
          <li>Controle de demandas e solicitações;</li>
          <li>Agenda de eventos;</li>
          <li>Gestão financeira;</li>
          <li>Movimentos e coordenações;</li>
          <li>Relatórios e análises;</li>
          <li>Assessor de Inteligência Artificial.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-2">3. Cadastro e Acesso</h2>
        <p>O acesso à Plataforma é restrito a usuários autorizados. Cada usuário é responsável por manter a confidencialidade de suas credenciais de acesso (e-mail e senha). Não compartilhe suas credenciais com terceiros.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-2">4. Responsabilidades do Usuário</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Utilizar a Plataforma de forma ética e em conformidade com a legislação;</li>
          <li>Não inserir conteúdo ilícito, ofensivo ou que viole direitos de terceiros;</li>
          <li>Manter seus dados cadastrais atualizados;</li>
          <li>Comunicar imediatamente qualquer uso não autorizado da sua conta;</li>
          <li>Não tentar acessar áreas ou funcionalidades não autorizadas ao seu perfil.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-2">5. Propriedade Intelectual</h2>
        <p>Todo o conteúdo, código-fonte, design, marcas e logotipos da Plataforma são de propriedade exclusiva do Gabinete Digital ou de seus licenciadores. É proibida a reprodução, distribuição ou modificação sem autorização prévia por escrito.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-2">6. Disponibilidade</h2>
        <p>Nos esforçamos para manter a Plataforma disponível 24 horas por dia. No entanto, poderemos realizar manutenções programadas ou emergenciais que podem resultar em indisponibilidade temporária, sem aviso prévio obrigatório.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-2">7. Limitação de Responsabilidade</h2>
        <p>A Plataforma é fornecida "como está". Não nos responsabilizamos por:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Perdas decorrentes de uso indevido pelo usuário;</li>
          <li>Falhas causadas por infraestrutura de terceiros (internet, navegadores);</li>
          <li>Danos indiretos ou consequenciais.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-2">8. Suspensão e Encerramento</h2>
        <p>Reservamo-nos o direito de suspender ou encerrar o acesso de qualquer usuário que viole estes Termos, sem aviso prévio, sem prejuízo de outras medidas legais cabíveis.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-2">9. Alterações</h2>
        <p>Estes Termos podem ser atualizados a qualquer momento. A continuidade do uso da Plataforma após alterações constitui aceitação dos novos termos.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-2">10. Foro</h2>
        <p>Para dirimir quaisquer controvérsias, fica eleito o foro da comarca de domicílio do administrador da Plataforma, com renúncia expressa a qualquer outro, por mais privilegiado que seja.</p>
      </section>
    </div>

    <div className="mt-10 pt-6 border-t border-border">
      <a href="/login" className="text-primary hover:underline text-sm">← Voltar ao login</a>
    </div>
  </div>
);

export default TermosUso;
