# Auth Studio → servidor MCP via Bearer token estático

A conexão do Deco Studio com o servidor MCP é autenticada por um Bearer token estático, validado em middleware contra um secret em variável de ambiente — não um fluxo OAuth/JWT completo (como nos samples oficiais do SDK com Entra ID). O Deco Studio suporta headers HTTP customizados na configuração de uma Connection, então isso funciona nativamente sem precisar hospedar um authorization server à parte, custo desproporcional ao prazo do hackathon.
