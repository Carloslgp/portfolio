// src/scripts/ringEntry.ts — "esta entrada do histórico foi aberta pelo anel?"
//
// O /craft, a /work e a /now voltam PELA HISTÓRIA quando vieram do anel: o
// BFCache devolve a home viva, que é a melhor volta possível. Pra isso a home
// deixa o próprio endereço no sessionStorage logo antes de navegar (main.ts →
// rememberHome), e é esse recado que diz "a entrada anterior é o anel".
//
// O recado é CONSUMIDO na primeira leitura e passa a morar no history.state,
// que é da ENTRADA e não da aba: sobrevive a reload e ao BFCache, e não vaza
// pra entrada nenhuma além desta.
//
// Solto no sessionStorage, ele valia pra qualquer visita seguinte à mesma
// página, e foi isso que quebrou o Back quando o /craft ganhou as salas. O
// "‹ Back" de uma sala é um link comum e empilha um /craft NOVO; esse /craft
// também achava o recado, e o history.back() dele voltava pra sala, não pro
// anel. Com a /work acontecia o mesmo, chegando nela pelo rodapé das salas.
//
// É o mesmo contrato do Voltar do /photos (ver photos/main.ts).

/** O endereço da home que abriu ESTA entrada do histórico, ou null quando a
 *  página foi aberta por link, por URL digitada ou por outra página. */
export function claimRingEntry(homeKey: string): string | null {
  let home: string | null = null;
  try {
    home = sessionStorage.getItem(homeKey);
    if (home) sessionStorage.removeItem(homeKey);
  } catch {}

  if (home) {
    try {
      history.replaceState({ ...history.state, [homeKey]: home }, '');
    } catch {}
    return home;
  }

  const stamped = history.state?.[homeKey];
  return typeof stamped === 'string' ? stamped : null;
}
