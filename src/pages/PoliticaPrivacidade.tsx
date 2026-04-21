const PoliticaPrivacidade = () => (
  <div className="min-h-screen bg-background p-6 sm:p-12 max-w-4xl mx-auto">
    <h1 className="text-3xl font-bold text-foreground mb-6">Política de Privacidade</h1>
    <p className="text-sm text-muted-foreground mb-8">Última atualização: 21 de fevereiro de 2026</p>

    <div className="space-y-6 text-sm text-foreground/80 leading-relaxed">
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-2">1. Introdução</h2>
        <p>O sistema Gestão Inteligente – Gabinete Digital ("Plataforma") tem o compromisso de proteger a privacidade e os dados pessoais de seus usuários. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações, em conformidade com a Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/2018).</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-2">2. Dados Coletados</h2>
        <p>Podemos coletar os seguintes dados pessoais:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Nome completo e e-mail (para cadastro e autenticação);</li>
          <li>Foto de perfil (opcional);</li>
          <li>Cargo e função no sistema;</li>
          <li>Dados de navegação e uso da Plataforma (logs de acesso);</li>
          <li>Informações inseridas em demandas, eventos, movimentos e registros financeiros.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-2">3. Finalidade do Tratamento</h2>
        <p>Os dados coletados são utilizados para:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Autenticação e controle de acesso;</li>
          <li>Gestão de demandas, eventos e atividades;</li>
          <li>Geração de relatórios e análises;</li>
          <li>Comunicação interna e notificações;</li>
          <li>Melhoria contínua da Plataforma.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-2">4. Compartilhamento de Dados</h2>
        <p>Seus dados pessoais não são vendidos, alugados ou compartilhados com terceiros, exceto quando necessário para o funcionamento da Plataforma (serviços de infraestrutura e hospedagem) ou por obrigação legal.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-2">5. Armazenamento e Segurança</h2>
        <p>Os dados são armazenados em servidores seguros com criptografia, controle de acesso baseado em papéis (RBAC) e políticas de segurança em nível de linha (RLS). Adotamos medidas técnicas e organizacionais para proteger suas informações contra acesso não autorizado, perda ou destruição.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-2">6. Direitos do Titular</h2>
        <p>Você tem direito a:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Acessar seus dados pessoais;</li>
          <li>Solicitar correção de dados incompletos ou desatualizados;</li>
          <li>Solicitar a exclusão dos seus dados;</li>
          <li>Revogar o consentimento a qualquer momento;</li>
          <li>Solicitar portabilidade dos dados.</li>
        </ul>
        <p className="mt-2">Para exercer seus direitos, entre em contato com o administrador da Plataforma.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-2">7. Cookies</h2>
        <p>A Plataforma utiliza cookies essenciais para autenticação e funcionamento. Não utilizamos cookies de rastreamento de terceiros para fins publicitários.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-2">8. Alterações</h2>
        <p>Esta Política pode ser atualizada periodicamente. Recomendamos a leitura regular deste documento. Alterações significativas serão comunicadas dentro da Plataforma.</p>
      </section>
    </div>

    <div className="mt-10 pt-6 border-t border-border">
      <a href="/login" className="text-primary hover:underline text-sm">← Voltar ao login</a>
    </div>
  </div>
);

export default PoliticaPrivacidade;
