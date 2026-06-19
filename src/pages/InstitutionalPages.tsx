import { PublicFooter } from '../components/PublicFooter'
import { PublicNavbar } from '../components/PublicNavbar'

const documentLastUpdated = '17 de junho de 2026'
const contactEmail = 'contatolarmap@gmail.com'
const contactWhatsApp = '+55 22 99279-4218'
const contactWhatsAppHref = 'https://wa.me/5522992794218'
const contactSite = 'larmap.com.br'

type ContentBlock =
  | { items: string[]; type: 'list' }
  | { text: string; type: 'paragraph' }
  | { text: string; type: 'subheading' }
  | { type: 'officialContact' }

interface DocumentSection {
  blocks: ContentBlock[]
  id: string
  title: string
}

interface DocumentPageProps {
  intro: string[]
  sections: DocumentSection[]
  title: string
}

const termsSections: DocumentSection[] = [
  {
    id: 'sobre-o-larmap',
    title: '1. Sobre o LarMap',
    blocks: [
      { type: 'paragraph', text: 'O LarMap é uma plataforma digital destinada à divulgação de imóveis, anúncios imobiliários, informações sobre bairros, regiões, empreendimentos, corretores, imobiliárias e serviços relacionados ao mercado imobiliário.' },
      { type: 'paragraph', text: 'O LarMap atua como plataforma de divulgação e conexão entre usuários, anunciantes e interessados, não participando diretamente das negociações, contratos, pagamentos ou transações imobiliárias realizadas entre as partes.' },
    ],
  },
  {
    id: 'cadastro-de-usuarios',
    title: '2. Cadastro de Usuários',
    blocks: [
      { type: 'paragraph', text: 'Para utilizar determinadas funcionalidades, o usuário poderá realizar cadastro mediante fornecimento de informações verdadeiras, completas e atualizadas.' },
      { type: 'paragraph', text: 'O usuário é responsável por:' },
      { type: 'list', items: ['Manter seus dados atualizados;', 'Preservar a confidencialidade de sua senha;', 'Não compartilhar sua conta com terceiros;', 'Comunicar imediatamente qualquer uso não autorizado de sua conta.'] },
      { type: 'paragraph', text: 'O LarMap poderá suspender ou excluir contas que apresentem informações falsas, fraudulentas ou que violem estes Termos.' },
    ],
  },
  {
    id: 'anuncios-de-imoveis',
    title: '3. Anúncios de Imóveis',
    blocks: [
      { type: 'paragraph', text: 'Ao publicar um anúncio, o usuário declara que:' },
      { type: 'list', items: ['Possui autorização para anunciar o imóvel;', 'As informações fornecidas são verdadeiras;', 'As imagens utilizadas pertencem ao anunciante ou possuem autorização de uso;', 'O imóvel está disponível para negociação nas condições anunciadas.'] },
      { type: 'paragraph', text: 'O anunciante é integralmente responsável pelo conteúdo publicado.' },
      { type: 'paragraph', text: 'O LarMap poderá remover anúncios que:' },
      { type: 'list', items: ['Contenham informações falsas;', 'Sejam considerados enganosos;', 'Infrinjam direitos de terceiros;', 'Violem legislação aplicável;', 'Sejam incompatíveis com os objetivos da plataforma.'] },
    ],
  },
  {
    id: 'responsabilidade-pelas-negociacoes',
    title: '4. Responsabilidade pelas Negociações',
    blocks: [
      { type: 'paragraph', text: 'O LarMap não garante:' },
      { type: 'list', items: ['A venda, locação ou negociação de imóveis;', 'A veracidade absoluta das informações inseridas por anunciantes;', 'A disponibilidade dos imóveis anunciados;', 'A conclusão de qualquer negócio entre as partes.'] },
      { type: 'paragraph', text: 'Toda negociação ocorre sob responsabilidade exclusiva dos usuários envolvidos.' },
    ],
  },
  {
    id: 'planos-e-servicos-pagos',
    title: '5. Planos e Serviços Pagos',
    blocks: [
      { type: 'paragraph', text: 'Algumas funcionalidades poderão ser disponibilizadas mediante contratação de planos pagos.' },
      { type: 'paragraph', text: 'Os valores, condições, benefícios e prazos serão informados previamente ao usuário.' },
      { type: 'paragraph', text: 'O LarMap poderá alterar preços, funcionalidades ou características dos planos mediante comunicação prévia.' },
    ],
  },
  {
    id: 'condutas-proibidas',
    title: '6. Condutas Proibidas',
    blocks: [
      { type: 'paragraph', text: 'É proibido:' },
      { type: 'list', items: ['Utilizar a plataforma para fins ilícitos;', 'Publicar informações falsas ou enganosas;', 'Violar direitos autorais ou propriedade intelectual;', 'Tentar acessar áreas restritas sem autorização;', 'Praticar spam ou envio massivo de mensagens;', 'Utilizar robôs ou sistemas automatizados sem autorização;', 'Comprometer a segurança da plataforma.'] },
      { type: 'paragraph', text: 'O descumprimento poderá resultar em suspensão ou exclusão da conta.' },
    ],
  },
  {
    id: 'propriedade-intelectual',
    title: '7. Propriedade Intelectual',
    blocks: [
      { type: 'paragraph', text: 'A marca LarMap, seu logotipo, layout, códigos, textos, funcionalidades e demais elementos da plataforma são protegidos pela legislação aplicável.' },
      { type: 'paragraph', text: 'É proibida a reprodução, distribuição ou utilização sem autorização expressa.' },
    ],
  },
  {
    id: 'limitacao-de-responsabilidade',
    title: '8. Limitação de Responsabilidade',
    blocks: [
      { type: 'paragraph', text: 'O LarMap não será responsável por:' },
      { type: 'list', items: ['Prejuízos decorrentes de negociações realizadas entre usuários;', 'Informações incorretas fornecidas por anunciantes;', 'Interrupções temporárias do serviço;', 'Danos causados por terceiros;', 'Decisões tomadas com base nas informações disponibilizadas na plataforma.'] },
    ],
  },
  {
    id: 'privacidade-e-protecao',
    title: '9. Privacidade e Proteção de Dados',
    blocks: [
      { type: 'paragraph', text: 'O tratamento de dados pessoais ocorre conforme a Política de Privacidade do LarMap.' },
      { type: 'paragraph', text: 'Ao utilizar a plataforma, o usuário declara ciência e concordância com a referida política.' },
    ],
  },
  {
    id: 'alteracoes-dos-termos',
    title: '10. Alterações dos Termos',
    blocks: [
      { type: 'paragraph', text: 'O LarMap poderá modificar estes Termos a qualquer momento.' },
      { type: 'paragraph', text: 'As alterações entrarão em vigor após sua publicação na plataforma.' },
      { type: 'paragraph', text: 'O uso continuado da plataforma após a atualização constitui aceitação dos novos Termos.' },
    ],
  },
  {
    id: 'legislacao-e-foro',
    title: '11. Legislação e Foro',
    blocks: [
      { type: 'paragraph', text: 'Estes Termos são regidos pelas leis da República Federativa do Brasil.' },
      { type: 'paragraph', text: 'Fica eleito o foro da comarca de Rio de Janeiro, RJ, com renúncia a qualquer outro, para resolução de conflitos relacionados a estes Termos.' },
    ],
  },
  {
    id: 'contato',
    title: '12. Contato',
    blocks: [
      { type: 'paragraph', text: 'Dúvidas ou solicitações poderão ser encaminhadas para:' },
      { type: 'officialContact' },
      { type: 'paragraph', text: 'LarMap - Conectando pessoas, imóveis e regiões.' },
    ],
  },
]

const privacySections: DocumentSection[] = [
  {
    id: 'quem-somos',
    title: '1. Quem Somos',
    blocks: [
      { type: 'paragraph', text: 'O LarMap é uma plataforma digital destinada à divulgação, pesquisa e intermediação de informações relacionadas a imóveis, corretores, imobiliárias, construtoras e serviços vinculados ao setor imobiliário.' },
      { type: 'paragraph', text: `Caso tenha dúvidas sobre esta Política ou sobre o tratamento de seus dados pessoais, entre em contato pelo e-mail: ${contactEmail}.` },
    ],
  },
  {
    id: 'dados-coletados',
    title: '2. Dados Coletados',
    blocks: [
      { type: 'paragraph', text: 'Podemos coletar os seguintes dados pessoais:' },
      { type: 'subheading', text: 'Dados fornecidos pelo usuário' },
      { type: 'list', items: ['Nome completo;', 'E-mail;', 'Número de telefone;', 'Cidade e estado;', 'Dados de cadastro de corretores, imobiliárias e anunciantes;', 'Informações de imóveis cadastrados;', 'Fotografias e documentos enviados pelo usuário;', 'Outras informações fornecidas voluntariamente.'] },
      { type: 'subheading', text: 'Dados coletados automaticamente' },
      { type: 'paragraph', text: 'Ao acessar a plataforma, poderemos coletar:' },
      { type: 'list', items: ['Endereço IP;', 'Tipo de dispositivo utilizado;', 'Navegador utilizado;', 'Sistema operacional;', 'Data e horário de acesso;', 'Páginas visitadas;', 'Dados de geolocalização, quando autorizados pelo usuário;', 'Cookies e tecnologias semelhantes.'] },
    ],
  },
  {
    id: 'finalidade',
    title: '3. Finalidade do Tratamento dos Dados',
    blocks: [
      { type: 'paragraph', text: 'Os dados coletados poderão ser utilizados para:' },
      { type: 'list', items: ['Criar e gerenciar contas de usuários;', 'Permitir a publicação e divulgação de anúncios imobiliários;', 'Facilitar o contato entre anunciantes e interessados;', 'Melhorar a experiência de navegação;', 'Personalizar conteúdos e recomendações;', 'Realizar análises estatísticas e de desempenho da plataforma;', 'Cumprir obrigações legais e regulatórias;', 'Enviar comunicações institucionais, promocionais e informativas, quando autorizado pelo usuário;', 'Prevenir fraudes e garantir a segurança da plataforma.'] },
    ],
  },
  {
    id: 'compartilhamento',
    title: '4. Compartilhamento de Dados',
    blocks: [
      { type: 'paragraph', text: 'O LarMap não comercializa dados pessoais.' },
      { type: 'paragraph', text: 'Os dados poderão ser compartilhados apenas quando necessário com:' },
      { type: 'list', items: ['Prestadores de serviços contratados para operação da plataforma;', 'Empresas de hospedagem, armazenamento e processamento de dados;', 'Ferramentas de análise, marketing e automação;', 'Autoridades públicas, mediante obrigação legal ou ordem judicial;', 'Parceiros comerciais, quando houver consentimento do usuário.'] },
      { type: 'paragraph', text: 'Todos os parceiros são selecionados com base em critérios de segurança e conformidade com a legislação vigente.' },
    ],
  },
  {
    id: 'cookies',
    title: '5. Cookies e Tecnologias Semelhantes',
    blocks: [
      { type: 'paragraph', text: 'Utilizamos cookies para melhorar a experiência do usuário.' },
      { type: 'paragraph', text: 'Os cookies podem ser utilizados para:' },
      { type: 'list', items: ['Manter sessões ativas;', 'Armazenar preferências;', 'Realizar análises estatísticas;', 'Exibir conteúdos e anúncios relevantes;', 'Medir o desempenho da plataforma.'] },
      { type: 'paragraph', text: 'O usuário pode configurar seu navegador para bloquear ou remover cookies, porém algumas funcionalidades poderão ser afetadas.' },
    ],
  },
  {
    id: 'base-legal',
    title: '6. Base Legal para o Tratamento',
    blocks: [
      { type: 'paragraph', text: 'O tratamento dos dados pessoais poderá ocorrer com base nas seguintes hipóteses previstas na LGPD:' },
      { type: 'list', items: ['Consentimento do titular;', 'Cumprimento de obrigação legal ou regulatória;', 'Execução de contrato;', 'Exercício regular de direitos;', 'Legítimo interesse do controlador;', 'Proteção do crédito;', 'Outras hipóteses previstas na legislação aplicável.'] },
    ],
  },
  {
    id: 'armazenamento',
    title: '7. Armazenamento e Segurança dos Dados',
    blocks: [
      { type: 'paragraph', text: 'Adotamos medidas técnicas e administrativas adequadas para proteger os dados pessoais contra acessos não autorizados, perda, alteração, divulgação ou destruição.' },
      { type: 'paragraph', text: 'Os dados poderão ser armazenados em servidores próprios ou de terceiros contratados, localizados no Brasil ou no exterior, observadas as exigências legais aplicáveis.' },
    ],
  },
  {
    id: 'direitos',
    title: '8. Direitos dos Titulares',
    blocks: [
      { type: 'paragraph', text: 'Nos termos da LGPD, o usuário poderá solicitar a qualquer momento:' },
      { type: 'list', items: ['Confirmação da existência de tratamento;', 'Acesso aos dados pessoais;', 'Correção de dados incompletos, inexatos ou desatualizados;', 'Anonimização, bloqueio ou eliminação de dados desnecessários;', 'Portabilidade dos dados;', 'Informações sobre compartilhamento de dados;', 'Revogação do consentimento;', 'Exclusão dos dados tratados com base no consentimento.'] },
      { type: 'paragraph', text: 'As solicitações poderão ser realizadas através do e-mail informado nesta Política.' },
    ],
  },
  {
    id: 'retencao',
    title: '9. Retenção dos Dados',
    blocks: [
      { type: 'paragraph', text: 'Os dados serão mantidos pelo período necessário para cumprir as finalidades descritas nesta Política, respeitando obrigações legais, regulatórias e a necessidade de defesa de direitos do LarMap.' },
    ],
  },
  {
    id: 'links-terceiros',
    title: '10. Links para Terceiros',
    blocks: [
      { type: 'paragraph', text: 'A plataforma poderá conter links para sites, aplicativos ou serviços de terceiros. O LarMap não se responsabiliza pelas práticas de privacidade adotadas por esses ambientes externos.' },
      { type: 'paragraph', text: 'Recomendamos que o usuário consulte as respectivas políticas de privacidade antes de fornecer qualquer dado pessoal.' },
    ],
  },
  {
    id: 'alteracoes',
    title: '11. Alterações Desta Política',
    blocks: [
      { type: 'paragraph', text: 'Esta Política de Privacidade poderá ser alterada a qualquer momento para refletir mudanças legais, operacionais ou tecnológicas.' },
      { type: 'paragraph', text: 'A versão atualizada estará sempre disponível na plataforma, acompanhada da data de sua última atualização.' },
    ],
  },
  {
    id: 'contato',
    title: '12. Contato',
    blocks: [
      { type: 'paragraph', text: 'Em caso de dúvidas, solicitações ou exercício de direitos relacionados aos seus dados pessoais, entre em contato:' },
      { type: 'officialContact' },
      { type: 'paragraph', text: 'Ao utilizar o LarMap, o usuário declara ter lido e concordado com os termos desta Política de Privacidade.' },
    ],
  },
]

const cookiesSections: DocumentSection[] = [
  {
    id: 'o-que-sao-cookies',
    title: '1. O que são cookies?',
    blocks: [
      { type: 'paragraph', text: 'Cookies são pequenos arquivos de texto armazenados em seu dispositivo quando você acessa um site.' },
      { type: 'paragraph', text: 'Eles ajudam a lembrar preferências, melhorar o desempenho da plataforma e fornecer informações estatísticas sobre sua utilização.' },
    ],
  },
  {
    id: 'como-utilizamos',
    title: '2. Como Utilizamos os Cookies',
    blocks: [
      { type: 'paragraph', text: 'Utilizamos cookies para:' },
      { type: 'list', items: ['Garantir o funcionamento adequado da plataforma;', 'Manter sessões de usuários autenticados;', 'Salvar preferências de navegação;', 'Melhorar a experiência do usuário;', 'Analisar o desempenho do site;', 'Medir a eficácia de campanhas publicitárias;', 'Personalizar conteúdos e anúncios.'] },
    ],
  },
  {
    id: 'tipos-de-cookies',
    title: '3. Tipos de Cookies Utilizados',
    blocks: [
      { type: 'subheading', text: 'Cookies Essenciais' },
      { type: 'paragraph', text: 'São necessários para o funcionamento da plataforma.' },
      { type: 'paragraph', text: 'Sem eles, determinados recursos podem não funcionar corretamente.' },
      { type: 'paragraph', text: 'Exemplos:' },
      { type: 'list', items: ['Login de usuários;', 'Segurança;', 'Gerenciamento de sessão.'] },
      { type: 'subheading', text: 'Cookies de Desempenho' },
      { type: 'paragraph', text: 'Coletam informações sobre a utilização da plataforma.' },
      { type: 'paragraph', text: 'Permitem identificar páginas mais acessadas, desempenho e possíveis falhas.' },
      { type: 'subheading', text: 'Cookies Funcionais' },
      { type: 'paragraph', text: 'Permitem lembrar preferências e configurações do usuário.' },
      { type: 'paragraph', text: 'Exemplos:' },
      { type: 'list', items: ['Idioma;', 'Localização;', 'Preferências de exibição.'] },
      { type: 'subheading', text: 'Cookies de Marketing' },
      { type: 'paragraph', text: 'Utilizados para apresentar anúncios mais relevantes e medir resultados de campanhas.' },
      { type: 'paragraph', text: 'Podem ser utilizados por parceiros como:' },
      { type: 'list', items: ['Google Ads;', 'Meta Ads (Facebook e Instagram);', 'Outras plataformas de publicidade.'] },
    ],
  },
  {
    id: 'ferramentas-de-terceiros',
    title: '4. Ferramentas de Terceiros',
    blocks: [
      { type: 'paragraph', text: 'O LarMap poderá utilizar ferramentas como:' },
      { type: 'list', items: ['Google Analytics;', 'Google Tag Manager;', 'Google Ads;', 'Meta Pixel;', 'RD Station;', 'Ferramentas de CRM;', 'Ferramentas de automação de marketing.'] },
      { type: 'paragraph', text: 'Esses serviços podem armazenar cookies próprios para análise de comportamento e desempenho.' },
    ],
  },
  {
    id: 'gerenciamento',
    title: '5. Gerenciamento de Cookies',
    blocks: [
      { type: 'paragraph', text: 'O usuário pode controlar ou excluir cookies diretamente em seu navegador.' },
      { type: 'paragraph', text: 'A desativação de determinados cookies poderá impactar funcionalidades da plataforma.' },
      { type: 'paragraph', text: 'Links úteis:' },
      { type: 'list', items: ['Google Chrome', 'Mozilla Firefox', 'Microsoft Edge', 'Safari'] },
      { type: 'paragraph', text: 'Os respectivos links de gerenciamento poderão ser incluídos conforme necessário.' },
    ],
  },
  {
    id: 'alteracoes',
    title: '6. Alterações Desta Política',
    blocks: [
      { type: 'paragraph', text: 'Esta Política poderá ser atualizada periodicamente para refletir alterações legais ou operacionais.' },
      { type: 'paragraph', text: 'A versão mais recente estará sempre disponível na plataforma.' },
    ],
  },
  {
    id: 'contato',
    title: '7. Contato',
    blocks: [
      { type: 'paragraph', text: 'Em caso de dúvidas sobre esta Política de Cookies:' },
      { type: 'officialContact' },
      { type: 'paragraph', text: 'LarMap - Tecnologia para conectar pessoas e oportunidades imobiliárias.' },
    ],
  },
]

function OfficialContactList() {
  return (
    <dl className="institutional-contact-list">
      <div>
        <dt>E-mail</dt>
        <dd>
          <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
        </dd>
      </div>
      <div>
        <dt>WhatsApp</dt>
        <dd>
          <a href={contactWhatsAppHref} rel="noreferrer" target="_blank">
            {contactWhatsApp}
          </a>
        </dd>
      </div>
      <div>
        <dt>Site</dt>
        <dd>
          <a href={`https://${contactSite}`} rel="noreferrer" target="_blank">
            {contactSite}
          </a>
        </dd>
      </div>
    </dl>
  )
}

function RenderBlock({ block }: { block: ContentBlock }) {
  if (block.type === 'paragraph') return <p>{block.text}</p>
  if (block.type === 'subheading') return <h3>{block.text}</h3>
  if (block.type === 'officialContact') return <OfficialContactList />

  return (
    <ul>
      {block.items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

function DocumentPage({ intro, sections, title }: DocumentPageProps) {
  return (
    <div className="institutional-site institutional-site--legal">
      <PublicNavbar />
      <main className="legal-main">
        <article className="legal-document">
          <header className="legal-header">
            <h1>{title}</h1>
            <p>Última atualização: {documentLastUpdated}</p>
          </header>

          <div className="legal-intro">
            {intro.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <div className="legal-section-stack">
            {sections.map((section) => (
              <section className="legal-section" id={section.id} key={section.id}>
                <h2>{section.title}</h2>
                <div className="legal-section__body">
                  {section.blocks.map((block, index) => (
                    <RenderBlock block={block} key={`${section.id}-${index}`} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>
      </main>
      <PublicFooter />
    </div>
  )
}

export function AboutPage() {
  const audience = [
    'Pessoas em busca de imóveis para compra ou aluguel;',
    'Investidores que procuram novas oportunidades;',
    'Proprietários que desejam divulgar seus imóveis;',
    'Corretores autônomos;',
    'Imobiliárias;',
    'Incorporadoras;',
    'Empresas do setor imobiliário.',
  ]
  const differentiators = [
    'Busca baseada em mapas e localização;',
    'Exploração visual de bairros, cidades e regiões;',
    'Visualização intuitiva de imóveis, terrenos e loteamentos;',
    'Experiência simplificada e centrada no usuário;',
    'Integração entre informações imobiliárias e geográficas;',
    'Evolução contínua de recursos inteligentes e personalização.',
  ]
  const values = [
    {
      title: 'Transparência',
      text: 'Acreditamos que decisões imobiliárias importantes devem ser tomadas com base em informações claras e confiáveis.',
    },
    {
      title: 'Inovação',
      text: 'Buscamos constantemente novas formas de aplicar tecnologia ao mercado imobiliário.',
    },
    {
      title: 'Simplicidade',
      text: 'Valorizamos experiências intuitivas, acessíveis e fáceis de utilizar.',
    },
    {
      title: 'Foco no usuário',
      text: 'Todas as nossas soluções são desenvolvidas pensando nas necessidades reais de quem utiliza a plataforma.',
    },
    {
      title: 'Colaboração',
      text: 'Acreditamos no fortalecimento das conexões entre pessoas, profissionais e empresas do setor imobiliário.',
    },
    {
      title: 'Evolução contínua',
      text: 'Estamos em constante desenvolvimento para oferecer uma experiência cada vez melhor.',
    },
  ]

  return (
    <div className="institutional-site institutional-site--about">
      <PublicNavbar />
      <main className="about-main">
        <article className="about-document">
          <header className="about-header">
            <h1>Conheça a LarMap</h1>
            <p>Conectando pessoas, imóveis e regiões</p>
          </header>

          <section className="about-section">
            <p>
              A LarMap nasceu da percepção de que a localização é um dos fatores mais importantes na escolha de um
              imóvel, mas, paradoxalmente, é um dos aspectos menos valorizados pelas plataformas tradicionais de busca.
            </p>
            <p>
              Durante anos, a procura por imóveis foi baseada principalmente em listas, filtros e páginas de resultados
              que exigem que o usuário navegue por dezenas ou até centenas de anúncios antes de encontrar oportunidades
              em uma região de interesse. Esse processo, muitas vezes, torna a busca cansativa, pouco intuitiva e
              distante da forma como as pessoas realmente tomam decisões.
            </p>
            <p>
              Acreditamos que escolher um imóvel vai muito além de analisar fotos, metragem ou preço. É preciso
              compreender o entorno, conhecer os bairros, avaliar a infraestrutura disponível, entender o potencial de
              valorização da região e visualizar onde cada oportunidade está localizada.
            </p>
            <p>Foi com essa visão que criamos a LarMap.</p>
          </section>

          <section className="about-section">
            <h2>Uma nova forma de buscar imóveis</h2>
            <p>
              A LarMap é uma plataforma de inteligência imobiliária baseada em geolocalização que coloca o mapa no
              centro da experiência.
            </p>
            <p>
              Em vez de apresentar apenas listas de anúncios, permitimos que usuários explorem visualmente cidades,
              bairros e regiões para descobrir imóveis, terrenos, loteamentos e oportunidades imobiliárias exatamente
              onde desejam estar.
            </p>
            <p>
              Nosso objetivo é tornar a busca mais simples, transparente e eficiente, aproximando pessoas, imóveis e
              localização em uma única experiência digital.
            </p>
          </section>

          <section className="about-section">
            <h2>Tecnologia a serviço das decisões imobiliárias</h2>
            <p>
              Utilizamos tecnologia e recursos de geolocalização para transformar informações complexas em uma
              experiência mais intuitiva.
            </p>
            <p>
              A plataforma foi desenvolvida para permitir que usuários encontrem oportunidades de forma contextualizada,
              entendendo não apenas o imóvel anunciado, mas também a região em que ele está inserido.
            </p>
            <p>
              Ao unir mapas, dados geográficos e informações imobiliárias, ajudamos nossos usuários a tomar decisões
              mais seguras e bem fundamentadas.
            </p>
          </section>

          <section className="about-section">
            <h2>Para quem a LarMap foi criada</h2>
            <p>A LarMap foi desenvolvida para atender diferentes perfis do mercado imobiliário:</p>
            <ul>
              {audience.map((value) => (
                <li key={value}>{value}</li>
              ))}
            </ul>
            <p>
              Nosso compromisso é oferecer uma experiência útil tanto para quem busca um imóvel quanto para quem deseja
              anunciá-lo.
            </p>
          </section>

          <section className="about-section">
            <h2>Nossos diferenciais</h2>
            <p>Entre os principais diferenciais da LarMap estão:</p>
            <ul>
              {differentiators.map((value) => (
                <li key={value}>{value}</li>
              ))}
            </ul>
            <p>Estamos constantemente desenvolvendo novas funcionalidades para tornar a plataforma cada vez mais completa.</p>
          </section>

          <section className="about-section">
            <h2>Nossa missão</h2>
            <p>
              Simplificar a busca imobiliária por meio da tecnologia e da geolocalização, conectando pessoas, imóveis e
              oportunidades de forma mais eficiente.
            </p>
          </section>

          <section className="about-section">
            <h2>Nossa visão</h2>
            <p>
              Ser uma das principais referências em inteligência imobiliária baseada em localização no Brasil, oferecendo
              uma experiência cada vez mais completa para quem busca, anuncia ou investe em imóveis.
            </p>
          </section>

          <section className="about-section">
            <h2>Nossos valores</h2>
            <div className="about-values">
              {values.map((value) => (
                <section key={value.title}>
                  <h3>{value.title}</h3>
                  <p>{value.text}</p>
                </section>
              ))}
            </div>
          </section>

          <section className="about-section">
            <h2>Olhando para o futuro</h2>
            <p>Estamos construindo mais do que uma plataforma de anúncios.</p>
            <p>
              Nossa visão é desenvolver um ecossistema digital capaz de conectar pessoas, imóveis, profissionais e
              regiões por meio de tecnologia, inteligência geográfica e informações relevantes.
            </p>
            <p>
              A LarMap nasceu para transformar a forma como as pessoas descobrem oportunidades imobiliárias e para tornar
              cada decisão mais segura, inteligente e eficiente.
            </p>
          </section>
        </article>
      </main>
      <PublicFooter />
    </div>
  )
}

export function TermsPage() {
  return (
    <DocumentPage
      intro={[
        'Bem-vindo ao LarMap.',
        'Estes Termos de Uso regulam o acesso e a utilização da plataforma LarMap, disponível por meio de website, aplicativo ou quaisquer outros canais digitais vinculados à marca.',
        'Ao acessar ou utilizar o LarMap, o usuário declara ter lido, compreendido e concordado com estes Termos.',
      ]}
      sections={termsSections}
      title="Termos de Uso"
    />
  )
}

export function PrivacyPolicyPage() {
  return (
    <DocumentPage
      intro={[
        'O LarMap valoriza a privacidade e a proteção dos dados pessoais de seus usuários. Esta Política de Privacidade tem como objetivo esclarecer como coletamos, utilizamos, armazenamos e protegemos as informações fornecidas pelos usuários que acessam nossa plataforma, em conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados - LGPD).',
        'Ao utilizar o LarMap, você concorda com os termos desta Política de Privacidade.',
      ]}
      sections={privacySections}
      title="Política de Privacidade"
    />
  )
}

export function CookiesPolicyPage() {
  return (
    <DocumentPage
      intro={[
        'Esta Política de Cookies explica como o LarMap utiliza cookies e tecnologias semelhantes para melhorar a experiência dos usuários em nossa plataforma.',
        'Ao continuar navegando no LarMap, você concorda com o uso de cookies conforme descrito nesta Política.',
      ]}
      sections={cookiesSections}
      title="Política de Cookies"
    />
  )
}
