# 🌟 Guia de Identidade Visual & Design System — SENTINELA (Friendly Edition)

> **Conceito:** *O Companheiro de Trajeto / O Farol Amigo (Friendly Beacon)*  
> **Versão:** 2.0.0 (Human & Collaborative)  
> **Posicionamento:** Segurança urbana colaborativa, empatia, tranquilidade e a certeza de que nunca estás sozinho a voltar para casa.

---

## 1. O Conceito Criativo

O novo visual do **Sentinela** afasta-se de empresas de segurança privada ou alarmes bélicos e foca-se na **entreajuda comunitária e no companheirismo (estilo Waze / Zenly / Life360)**:
1. **O Pin-Farol Amigável:** Uma mascote/ícone curvilíneo inspirado num marcador de mapa geográfico que é, ao mesmo tempo, uma lanterna ou pequeno candeeiro com olhar atento e acolhedor.
2. **O Feixe de Luz Caloroso:** Um cone de luz em tons âmbar/dourado que ilumina a rua e acompanha o utilizador até à porta de sua casa.
3. **A Chegada Segura a Casa:** A pequena casa em tom esmeralda no ponto final do feixe de luz simboliza o alívio e a tranquilidade da chegada ("Avisa-me quando chegares").

---

## 2. Paleta Cromática Oficial (Design Tokens)

Desenvolvida com contraste acolhedor, tons quentes de luz noturna e harmonia com o Dark Mode:

```typescript
// theme/colors.ts (React Native / Expo)
export const SentinelaColors = {
  // Primárias (Amizade & Luz Amiga)
  primary: {
    pinSky: '#38BDF8',          // Corpo do Pin, botões principais de navegação
    skyDeep: '#0284C7',         // Gradiente do corpo
    lanternWarm: '#FDE047',     // Luz do farol, halo e iluminação de ruas
    lanternAmber: '#F59E0B',    // Acentos dourados acolhedores
  },

  // Alertas & Confirmações
  status: {
    safeHome: '#34D399',        // Chegada segura a casa, perigo resolvido
    friendlySos: '#F43F5E',     // Botão SOS com toque humano e alta urgência
    warningAmber: '#FBBF24',    // Alerta de rua escura, obras, trânsito
  },

  // Superfícies Noturnas Acolhedoras (Warm Dark Theme)
  surface: {
    nightSky: '#1E1E38',        // Topo do ecrã e gradientes
    deepCanvas: '#14142B',      // Fundo principal da aplicação
    cardElevation1: '#1F1F3D',  // Cards de alertas e rotas
    cardElevation2: '#28284E',  // Modais de contactos de emergência
    borderSubtle: '#333360',    // Linhas divisórias suaves
  },

  // Tipografia & Conteúdo
  text: {
    primary: '#FFFFFF',         // Textos principais e moradas
    secondary: '#CBD5E1',       // Descrições e distância
    tertiary: '#94A3B8',        // Timestamps e metadados
    accent: '#38BDF8',          // Links e botões de atalho
  }
};
```

---

## 3. Tipografia

* **Wordmark / Logótipo:**
  * Família: `Plus Jakarta Sans` ou `Comfortaa` / `Nunito` (Weight: 800 / ExtraBold, minúsculas amigáveis).
  * O ponto do "i" de `sentinela` é desenhado como uma pequena luz amarela de farol.
* **Interface UI (React Native):**
  * Títulos: `Inter` / `Plus Jakarta Sans` SemiBold (`600`).
  * Textos: `Inter` Regular (`400`) e Medium (`500`).
  * Botões de Ação Rápida ("Ir para Casa"): Cantos arredondados (`borderRadius: 24`), com ícones carismáticos e texto acolhedor.

---

## 4. Ficheiros Vetoriais no Projeto

| Ficheiro | Dimensões | Aplicação |
| :--- | :--- | :--- |
| `assets/branding/sentinela-app-icon.svg` | 1024 × 1024 px | Ícone para App Store e Play Store. |
| `assets/branding/sentinela-adaptive-foreground.svg` | 432 × 432 px | Camada frontal amigável para Android 13+. |
| `assets/branding/sentinela-adaptive-background.svg` | 432 × 432 px | Fundo noturno suave para Android. |
| `assets/branding/sentinela-logo-horizontal.svg` | 960 × 260 px | Cabeçalho da app, web e README do repositório. |
| `assets/branding/sentinela-logo-stacked.svg` | 600 × 640 px | Versão vertical com a mascote e a assinatura amigável. |
| `assets/branding/sentinela-splash-screen.svg` | 1242 × 2688 px | Splash screen acolhedora para o arranque da aplicação. |

---

## 5. Diretrizes de UX/UI "Friendly"

1. **Tom de Voz Acolhedor:**
   - Em vez de "SISTEMA DE VIGILÂNCIA ATIVO", usa: *"Estamos atentos por ti. Boa caminhada!"*
   - Em vez de "ALERTA DE PERIGO NA ZONA", usa: *"Outros utilizadores assinalaram uma rua pouco iluminada aqui."*
2. **Botão de Emergência Empático:**
   - O botão SOS mantém a cor vibrante (`#F43F5E`), mas os microtextos e os fluxos de resolução privilegiam a calma e o envio de SMS imediato com carinho para os amigos e familiares.
3. **Chegada a Casa ("Safe Arrival"):**
   - Micro-animação alegre de confetes ou brilho verde suave quando o utilizador toca em "Cheguei a Casa", confirmando a segurança de forma reconfortante.
