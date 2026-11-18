# Tempo Certo

Aplicativo web de previsão do tempo que consome a API pública **Open-Meteo**
(gratuita, sem cadastro e sem chave de acesso). HTML, CSS e JavaScript puros, sem build e sem dependências.

## O que ele faz

- Busca de cidades com sugestões (digite 2 letras ou mais; navegue com as setas e Enter).
- Botão "Minha localização", usando a geolocalização do navegador.
- Tempo agora: temperatura, sensação, condição, máxima e mínima do dia.
- Detalhes: umidade, vento com direção, chuva, pressão, índice UV, nascer e pôr do sol.
- Próximas 24 horas, com temperatura e chance de chuva.
- Previsão de 7 dias com barra de faixa de temperatura.
- Cidades favoritas, salvas no navegador (até 12).
- Alternância entre °C/km/h/mm e °F/mph/in.
- Tema claro e escuro (segue o sistema; o botão "Tema" sobrescreve).
- Atualização automática a cada 10 minutos e ao voltar a conexão.
- Tratamento de erros: sem internet, limite de consultas, falha da API e permissão de localização negada.
- Acessível: foco visível, rótulos para leitor de tela, navegação por teclado.

## Como executar

Opção 1: abra `index.html` direto no navegador.

Opção 2 (recomendada, porque a geolocalização só funciona em `localhost` ou HTTPS):

```bash
cd tempo-certo
python3 -m http.server 8000
# abra http://localhost:8000
```

## Estrutura

| Arquivo | Função |
| --- | --- |
| `index.html` | Estrutura da página |
| `styles.css` | Visual, temas claro/escuro e layout responsivo |
| `lib.js` | Funções puras: códigos WMO, conversão de unidades, seleção de horas, formatação |
| `app.js` | Interface, busca, favoritos e chamadas à API |
| `test.js` | Testes das funções puras (`node test.js`) |

## APIs usadas

- Geocodificação: `https://geocoding-api.open-meteo.com/v1/search?name=...&count=6&language=pt`
- Previsão: `https://api.open-meteo.com/v1/forecast?latitude=...&longitude=...&current=...&hourly=...&daily=...&timezone=auto`

Documentação: <https://open-meteo.com/en/docs>

## Observações

- O uso gratuito da Open-Meteo é para fins não comerciais e exige atribuição (já incluída no rodapé).
  Para uso comercial, consulte os planos no site deles.
- Preferências (cidade, favoritas, unidades e tema) ficam no `localStorage` do navegador.
- Ideias para evoluir: gráfico de temperatura por hora, alertas de chuva, comparação entre cidades,
  transformar em PWA para instalar no celular.
