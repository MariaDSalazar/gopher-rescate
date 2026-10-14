'use strict';
// Gopher al Rescate · juego individual de arrays, slices y maps en Go.
// Los retos salen de datos.js, generado y verificado con Go por _fuente/construir.py. En datos.js todo va
// cifrado y en cadena: cada reto se abre con la llave que deja el reto anterior resuelto bien.

const J = window.JUEGO;
const CLAVE = 'gopher-rescate-v3';
let M = null;                // títulos de las misiones y versión de Go (se descifran al arrancar)
let TOTAL = 0, K0 = '';
const NV = [];               // ficha de cada misión ya abierta: contexto, memoria y declaración

let E = null;
let repaso = false;          // al rejugar una misión terminada no se cambia el puntaje

/* ---------------- estado ---------------- */
// resp: primer intento de cada reto (puntaje) · hecho: retos superados · k: llave de cada reto alcanzado
const nuevo = (nombre = '', apellido = '') => ({ nombre, apellido, resp: {}, hecho: {}, k: { '0-0': K0 } });
function cargar() {
  try { return { ...nuevo(), ...JSON.parse(localStorage.getItem(CLAVE)) }; }
  catch { return nuevo(); }
}
function guardar() { localStorage.setItem(CLAVE, JSON.stringify(E)); }
const clave = (n, r) => `${n}-${r}`;
const aciertos = () => Object.values(E.resp).filter(Boolean).length;
const respondidos = () => Object.keys(E.hecho).length;
const nRetos = n => J.retos[n].length;
const nivelHecho = n => J.retos[n].every((_, r) => E.hecho[clave(n, r)]);
const nivelAbierto = n => n === 0 || nivelHecho(n - 1);
const todoHecho = () => J.retos.every((_, n) => nivelHecho(n));
const primeroPendiente = n => J.retos[n].findIndex((_, r) => !E.hecho[clave(n, r)]);
const aciertosNivel = n => J.retos[n].filter((_, r) => E.resp[clave(n, r)]).length;
function estrellas(n) {
  const p = aciertosNivel(n) / nRetos(n);
  return p === 1 ? 3 : p >= .75 ? 2 : p >= .5 ? 1 : 0;
}

/* ---------------- utilidades ---------------- */
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const KW = /^(var|for|range|if|else|func|return|map)$/;
const FN = /^(make|append|len|cap|delete)$/;
const TIPO = /^(string|int|bool|float64)$/;
function resaltar(src) {
  return src.replace(/("(?:[^"\\]|\\.)*")|([A-Za-z_]\w*)|(\d+)|([\s\S])/g, (m, s, w, num) => {
    if (s) return `<span class="s">${esc(s)}</span>`;
    if (w) return KW.test(w) ? `<span class="k">${w}</span>` : FN.test(w) ? `<span class="f">${w}</span>` : TIPO.test(w) ? `<span class="t">${w}</span>` : w;
    if (num) return `<span class="n">${num}</span>`;
    return esc(m);
  });
}
const estrellasHTML = k => `<span class="estrellas">${[0, 1, 2].map(i => `<span class="${i < k ? 'on' : ''}">${ICONO.estrella}</span>`).join('')}</span>`;
const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e']);
function nombreBonito(s) {
  return s.trim().replace(/\s+/g, ' ').toLowerCase().split(' ')
    .map((p, i) => i > 0 && PARTICULAS.has(p) ? p : p.replace(/(^|['-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()))
    .join(' ');
}

function barra() {
  const quien = E.nombre ? `<div class="jugador"><b>${esc(E.nombre)} ${esc(E.apellido)}</b><br>${aciertos()} de ${TOTAL} aciertos</div>` : '';
  return `<header class="top"><div class="logo">${gopherSvg({ ojos: 'feliz' })}<span>Gopher al <b>Rescate</b></span></div>${quien}</header>`;
}
function pintar(html) {
  document.body.innerHTML = barra() + `<main id="app">${html}</main>`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

/* ---------------- memoria: array, slice o map dibujado en casillas ---------------- */
// op: {nombre, valores, clic, base} · base = valores originales, para marcar lo que cambió.
function memoriaHTML(est, op = {}) {
  const nombre = op.nombre || est.nombre, vals = op.valores || est.valores;
  const mismo = nombre === est.nombre, base = mismo && op.valores ? est.valores : null;
  if (!Array.isArray(vals)) {
    const tipo = mismo ? est.go : 'map[string]' + (typeof Object.values(vals)[0] === 'number' ? 'int' : 'string');
    const claves = [...new Set([...Object.keys(base || {}), ...Object.keys(vals)])];
    const pares = claves.map(k => {
      const cl = !(k in vals) ? 'fuera' : base && !(k in base) ? 'nuevo' : base && base[k] !== vals[k] ? 'cambio' : '';
      return `<div class="par ${cl}"><span class="k">"${esc(k)}"</span><span class="fl">→</span><span class="v">${esc(k in vals ? vals[k] : base[k])}</span>${cl === 'fuera' ? '<small>borrada</small>' : ''}</div>`;
    }).join('');
    return `<div class="memoria"><div class="mem-cab"><code>${esc(nombre)}</code><span class="tipo">${tipo}</span><span>len ${Object.keys(vals).length} · sin orden</span></div>
      <div class="pares">${pares}</div>${mismo && est.unidad ? `<p class="leyenda">Cada valor: ${est.unidad}</p>` : ''}</div>`;
  }
  const tipo = mismo ? est.go : '[]' + (typeof vals[0] === 'number' ? 'int' : 'string');
  const etiq = mismo ? est.etiquetas : null;
  const caja = (v, i) => {
    const cl = base ? (i >= base.length ? 'nuevo' : base[i] !== v ? 'cambio' : '') : (mismo ? '' : 'nuevo');
    const dentro = `<span class="idx">[${i}]</span><span class="val">${esc(v)}</span>${etiq ? `<span class="et">${etiq[i]}</span>` : ''}`;
    return op.clic ? `<button class="casilla" data-i="${i}">${dentro}</button>` : `<div class="casilla ${cl}" style="--d:${i * 60}ms">${dentro}</div>`;
  };
  return `<div class="memoria"><div class="mem-cab"><code>${esc(nombre)}</code><span class="tipo">${tipo}</span><span>len ${vals.length}</span></div>
    <div class="casillas">${vals.map(caja).join('')}</div>${mismo && est.unidad ? `<p class="leyenda">Valor de cada casilla: ${est.unidad}</p>` : ''}</div>`;
}

function codigoHTML(nv, rt, src) {
  const base = rt.propia ? '' : `<span class="base">${resaltar(nv.base)}</span>\n`;
  return `<pre class="go">${base}${resaltar(src)}</pre>`;
}
const terminal = (salida, titulo = `Salida real · ${M.go}`) =>
  `<div class="terminal"><div class="term-cab">${ICONO.terminal} ${titulo}</div><pre>${esc(salida)}</pre></div>`;

/* ---------------- pantallas ---------------- */
function inicio() {
  const chips = ['[7]int', '[]string', 'append', 's[1:4]', 'map[K]V', 'coma ok'].map(c => `<span class="chip oscuro">${c}</span>`).join('');
  const registro = E.nombre
    ? `<h2>Hola de nuevo, ${esc(E.nombre)}</h2><p class="suave">Llevas ${respondidos()} de ${TOTAL} retos y ${aciertos()} aciertos.</p>
       <div class="fila-btn"><button class="btn grande" id="seguir">Continuar el rescate ${ICONO.sig}</button></div>
       <div class="fila-btn"><button class="btn sec" id="otro">Soy otra persona / empezar de nuevo</button></div>`
    : `<h2>Registro</h2><p class="suave">Escribe tu nombre y tu apellido: aparecerán en tu certificado.</p>
       <label for="nom">Nombre</label><input type="text" id="nom" autocomplete="given-name" maxlength="30">
       <label for="ape">Apellido</label><input type="text" id="ape" autocomplete="family-name" maxlength="30">
       <p class="aviso" id="aviso"></p>
       <button class="btn grande" id="empezar">Empezar el rescate ${ICONO.sig}</button>`;
  pintar(`<section class="portada">${gopherSvg({ ojos: 'arriba', casco: true })}
      <h1>Gopher al <b>Rescate</b></h1>
      <p>Arrays, slices y maps en Go</p>
      <div class="chips-niveles">${chips}</div></section>
    <div class="card">${registro}</div>
    <div class="card"><h2>${ICONO.mapa} Cómo se juega</h2>
      <p>La ciudad tiene <b>6 emergencias</b> y el gopher necesita tu código para resolverlas: cortes de luz, aire contaminado, una sala de emergencias llena, un tramo cerrado del metro, el banco de sangre y un ataque a las contraseñas. Cada misión es más difícil que la anterior.</p>
      <p>En cada reto ves los datos en la memoria y tocas tu respuesta. Si te equivocas, verás <b>por qué</b> esa elección no sirve y lo vuelves a intentar: el reto se supera con la respuesta correcta y tu puntaje cuenta el <b>primer intento</b>.</p>
      <p>Al acertar miras <b>qué hace Go de verdad</b>, con su salida real. Al terminar recibes tu <b>certificado</b>.</p></div>`);
  if (E.nombre) {
    $('#seguir').onclick = mapa;
    $('#otro').onclick = () => { if (confirm('Se borrará el progreso guardado en este dispositivo. ¿Continuar?')) { E = nuevo(); guardar(); inicio(); } };
    return;
  }
  const valido = s => /^[\p{L}][\p{L}' -]{1,29}$/u.test(s.trim());
  $('#empezar').onclick = () => {
    const n = $('#nom').value, a = $('#ape').value;
    if (!valido(n) || !valido(a)) { $('#aviso').textContent = 'Escribe tu nombre y tu apellido (solo letras).'; return; }
    E = nuevo(nombreBonito(n), nombreBonito(a));
    guardar();
    mapa();
  };
}

function mapa() {
  repaso = false;
  const pct = Math.round(respondidos() / TOTAL * 100);
  const nodos = M.niveles.map((nv, n) => {
    const hecho = nivelHecho(n), abierto = nivelAbierto(n);
    const clase = hecho ? 'hecho' : abierto ? 'actual' : '';
    const der = hecho ? estrellasHTML(estrellas(n)) : abierto ? `<span class="chip">${ICONO.play} Jugar</span>` : `<span class="suave">${ICONO.candado}</span>`;
    return `<button class="nodo ${clase}" data-n="${n}" ${abierto ? '' : 'disabled'}>
      <span class="medalla">${ICONO[nv.icono]}<span class="num">${n + 1}</span></span>
      <span><b>Misión ${n + 1} · ${nv.caso}</b><small>${nv.titulo} · ${nv.clave}</small></span>${der}</button>`;
  }).join('');
  pintar(`<h2>${ICONO.mapa} Mapa del rescate</h2>
    <div class="progreso"><i style="width:${pct}%"></i></div>
    <div class="mapa">${nodos}</div>
    ${todoHecho() ? `<div class="fila-btn"><button class="btn grande" id="cert">${ICONO.trofeo} Ver mi certificado</button></div>` : ''}`);
  document.querySelectorAll('.nodo:not(:disabled)').forEach(b => { b.onclick = () => intro(+b.dataset.n); });
  if (todoHecho()) $('#cert').onclick = certificado;
}

const casoHTML = nv => `<div class="caso">${ICONO[nv.icono]}<div><b>${nv.caso}</b>${esc(nv.contexto)}</div></div>`;

// La ficha de una misión se abre con la llave de su primer reto.
async function mision(n) {
  NV[n] ??= { ...M.niveles[n], ...await abrirCon(J.niveles[n], E.k[clave(n, 0)], String(n), 'nivel') };
  return NV[n];
}

async function intro(n) {
  if (!E.k[clave(n, 0)]) { mapa(); return; }
  const nv = await mision(n);
  repaso = nivelHecho(n);
  const desde = repaso ? 0 : Math.max(primeroPendiente(n), 0);
  pintar(`<div class="cabeza-reto"><button class="btn sec" id="volver">${ICONO.mapa} Mapa</button>
      <span class="chip oscuro">Misión ${n + 1} · ${nv.titulo}</span></div>
    <div class="globo">${gopherSvg({ ojos: 'arriba', casco: true })}<div class="texto">${esc(nv.intro)}</div></div>
    <div class="card">
      ${casoHTML(nv)}
      ${memoriaHTML(nv.estructura)}
      <p class="suave" style="margin:12px 0 6px">Así se declara en Go:</p>
      <pre class="go">${resaltar(nv.base)}</pre>
      ${repaso ? '<p class="suave"><b>Modo repaso:</b> ya terminaste esta misión; tu puntaje no cambia.</p>' : ''}
      <div class="fila-btn"><button class="btn grande" id="comenzar">${desde ? `Seguir con el reto ${desde + 1}` : `Comenzar los ${nRetos(n)} retos`} ${ICONO.sig}</button></div>
    </div>`);
  $('#volver').onclick = mapa;
  $('#comenzar').onclick = () => reto(n, desde);
}

/* ---------------- retos cifrados en cadena ----------------
   Cada reto se abre con su llave, que solo trae el reto anterior resuelto bien. Al elegir, se abre solo la
   retroalimentación de lo elegido; la respuesta correcta nunca se muestra. Solo la respuesta correcta completa
   abre el resultado: explicación, salida real, memoria final y la llave del reto que sigue. */
const despuesDe = (n, r) => r + 1 < nRetos(n) ? [n, r + 1] : n + 1 < J.retos.length ? [n + 1, 0] : null;
const abrirCon = async (dato, ...partes) => Cifra.abrir(await Cifra.llave(...partes), dato);
const contenido = (n, r) => abrirCon(J.retos[n][r].c, E.k[clave(n, r)], clave(n, r), 'reto');
const parte = (n, r, p, i, v) => abrirCon(J.retos[n][r].p[p][i], E.k[clave(n, r)], clave(n, r), p, v);
async function calificar(n, r, rt, bien, detalles, canon) {
  let s = null;
  if (bien) { try { s = await abrirCon(J.retos[n][r].x, E.k[clave(n, r)], clave(n, r), 'fin', canon); } catch { s = null; } }
  const k = clave(n, r);
  if (!repaso && !(k in E.resp)) E.resp[k] = !!s;
  if (s) {
    E.hecho[k] = true;
    const sig = despuesDe(n, r);
    if (sig && s.sig) E.k[clave(...sig)] = s.sig;
  }
  guardar();
  responder(n, r, rt, s, detalles);
}

async function reto(n, r) {
  if (!E.k[clave(n, r)]) { mapa(); return; }
  const nv = await mision(n), rt = await contenido(n, r);
  const puntos = J.retos[n].map((_, k) => {
    const c = clave(n, k);
    return `<i class="${k === r ? 'ahora' : E.hecho[c] && !repaso ? (E.resp[c] ? 'ok' : 'no') : ''}"></i>`;
  }).join('');
  const conMemoria = !rt.propia && rt.tipo !== 'casilla' && rt.tipo !== 'clasifica';
  pintar(`<div class="cabeza-reto"><button class="btn sec" id="volver">${ICONO.mapa} Mapa</button>
      <span class="chip oscuro">Misión ${n + 1} · Reto ${r + 1} de ${nRetos(n)}</span><span class="puntos">${puntos}</span></div>
    <div class="card">
      ${casoHTML(nv)}
      <div class="${conMemoria ? 'reto-cuerpo' : ''}">
        ${conMemoria ? `<div>${memoriaHTML(nv.estructura)}</div>` : ''}
        <div><p class="pregunta">${esc(rt.pregunta)}</p>${rt.codigo ? codigoHTML(nv, rt, rt.codigo) : ''}<div id="zona"></div></div>
      </div>
      <div class="fila-btn oculto" id="nav"><button class="btn sec" id="reabrir">${ICONO.ojo} Ver retroalimentación</button>
        <button class="btn grande" id="siguiente2"></button></div>
    </div>
    <dialog id="dlg" aria-labelledby="dlg-titulo">
      <div class="dlg-cuerpo" id="retro"></div>
      <div class="dlg-pie"><button class="btn sec" id="cerrar">${ICONO.cerrar} Cerrar</button><button class="btn grande" id="siguiente"></button></div>
    </dialog>`);
  $('#volver').onclick = mapa;
  ({ casilla: zonaCasilla, opcion: zonaOpciones, error: zonaError, clasifica: zonaClasifica })[rt.tipo](n, r, rt, nv);
}

/* ---------------- tipos de reto: solo se marca lo elegido, nunca la respuesta correcta ---------------- */
function zonaCasilla(n, r, rt, nv) {
  const est = nv.estructura, multi = rt.n > 1, elegidas = new Set();
  $('#zona').innerHTML = `<p class="instruccion">${multi ? 'Toca las casillas y luego pulsa «Listo».' : 'Toca una casilla.'}</p>${memoriaHTML(est, { clic: true })}
    ${multi ? `<div class="fila-btn"><button class="btn azul" id="listo" disabled>${ICONO.bien} Listo</button></div>` : ''}`;
  const terminar = async sel => {
    $$('#zona .casilla').forEach(b => { b.disabled = true; b.classList.remove('sel'); });
    if (multi) $('#listo').disabled = true;
    sel.sort((a, b) => a - b);
    const fb = await Promise.all(sel.map(i => parte(n, r, 'cas', i, String(i))));
    sel.forEach((i, k) => $(`#zona .casilla[data-i="${i}"]`).classList.add(fb[k].ok ? 'ok' : 'no'));
    const quien = i => `[${i}] (${est.etiquetas ? `${est.etiquetas[i]}, ` : ''}${est.valores[i]})`;
    const malas = sel.filter((_, k) => !fb[k].ok), faltan = multi ? rt.n - (sel.length - malas.length) : 0;
    const det = [...malas.map(i => `Tocaste la casilla ${esc(quien(i))}. ${esc(fb[sel.indexOf(i)].porque)}`),
                 ...(faltan > 0 ? [`Te ${faltan === 1 ? 'falta 1 casilla' : `faltan ${faltan} casillas`} por marcar.`] : [])];
    calificar(n, r, rt, !det.length, det, sel.join(','));
  };
  $$('#zona .casilla').forEach(b => {
    b.onclick = () => {
      const i = +b.dataset.i;
      if (!multi) { terminar([i]); return; }
      if (elegidas.has(i)) elegidas.delete(i); else elegidas.add(i);
      b.classList.toggle('sel', elegidas.has(i));
      $('#listo').disabled = !elegidas.size;
    };
  });
  if (multi) $('#listo').onclick = () => terminar([...elegidas]);
}

function barajar(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function zonaOpciones(n, r, rt) {
  const orden = barajar(rt.opciones.map((_, i) => i));
  $('#zona').innerHTML = `<div class="opciones">${orden.map(i =>
    `<button class="op cod" data-i="${i}">${esc(rt.opciones[i])}</button>`).join('')}</div>`;
  $$('.op').forEach(b => {
    b.onclick = async () => {
      $$('.op').forEach(x => { x.disabled = true; });
      const i = +b.dataset.i, fb = await parte(n, r, 'op', i, rt.opciones[i]);
      b.classList.add(fb.ok ? 'ok' : 'no');
      calificar(n, r, rt, fb.ok, fb.ok ? [] : [esc(fb.porque)], rt.opciones[i]);
    };
  });
}

function zonaError(n, r, rt, nv) {
  const base = rt.propia ? '' : `<div class="linea base">${resaltar(nv.base)}</div>`;
  $('#zona').innerHTML = `<div class="lineas">${base}${rt.lineas.map((l, i) => `<button class="linea" data-i="${i}">${resaltar(l)}</button>`).join('')}</div>`;
  $$('button.linea').forEach(b => {
    b.onclick = async () => {
      $$('button.linea').forEach(x => { x.disabled = true; });
      const i = +b.dataset.i, fb = await parte(n, r, 'lin', i, String(i));
      b.classList.add(fb.ok ? 'ok' : 'no');
      calificar(n, r, rt, fb.ok, fb.ok ? [] : [esc(fb.porque)], String(i));
    };
  });
}

function zonaClasifica(n, r, rt) {
  const elegido = rt.items.map(() => null);
  $('#zona').innerHTML = `<div class="clasif">${rt.items.map((txt, k) => `<div class="cond" data-k="${k}"><span>${esc(txt)}</span>
      <div class="dos">${rt.opciones.map(o => `<button data-v="${o}">${o}</button>`).join('')}</div></div>`).join('')}</div>
    <div class="fila-btn"><button class="btn azul" id="comprobar" disabled>Comprobar</button></div>`;
  $$('.cond').forEach(c => {
    const k = +c.dataset.k;
    c.querySelectorAll('button').forEach(b => {
      b.onclick = () => {
        elegido[k] = b.dataset.v;
        c.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
        $('#comprobar').disabled = elegido.includes(null);
      };
    });
  });
  $('#comprobar').onclick = async () => {
    $('#comprobar').disabled = true;
    $$('.cond button').forEach(b => { b.disabled = true; });
    const fb = await Promise.all(elegido.map((v, k) => parte(n, r, `i${k}`, rt.opciones.indexOf(v), v)));
    $$('.cond').forEach(c => {
      const k = +c.dataset.k;
      c.querySelectorAll('button').forEach(b => { b.classList.remove('on'); if (b.dataset.v === elegido[k]) b.classList.add(fb[k].ok ? 'ok' : 'no'); });
    });
    const malas = elegido.map((_, k) => k).filter(k => !fb[k].ok);
    const det = malas.length ? [...malas.map(k => `<b>${esc(rt.items[k])}</b>: ${elegido[k]} no sirve aquí.`), esc(fb[malas[0]].porque)] : [];
    calificar(n, r, rt, !det.length, det, elegido.join('|'));
  };
}

/* ---------------- respuesta: al acertar se ve qué hace Go; al fallar, por qué no sirve, y se reintenta ---------------- */
function responder(n, r, rt, s, detalles) {
  const nv = NV[n], ok = !!s, ultimo = r === nRetos(n) - 1;
  const arte = ok ? gopherSvg({ ojos: 'feliz', boca: 'abierta' }) : sticker(rt.sticker ?? [3, 7][(n + r) % 2]);
  $('#retro').innerHTML = ok
    ? `<div class="retro ok">${arte}<div><h3 id="dlg-titulo">¡Correcto!</h3><p>${esc(s.explica)}</p></div></div>${solucion(nv, rt, s)}`
    : `<div class="retro no">${arte}<div><h3 id="dlg-titulo">No es correcto</h3>
       ${detalles.length ? `<p><b>Por qué no:</b></p><ul>${detalles.map(d => `<li>${d}</li>`).join('')}</ul>` : ''}
       <p class="suave">Relee el reto y vuelve a intentarlo.</p></div></div>`;
  const dlg = $('#dlg');
  const avanzar = () => { dlg.close(); if (!ok) reto(n, r); else if (ultimo) finNivel(n); else reto(n, r + 1); };
  ['#siguiente', '#siguiente2'].forEach(b => {
    $(b).innerHTML = !ok ? 'Intentar de nuevo' : ultimo ? `Terminar la misión ${ICONO.sig}` : `Siguiente reto ${ICONO.sig}`;
    $(b).onclick = avanzar;
  });
  $('#cerrar').onclick = () => dlg.close();
  $('#reabrir').onclick = () => dlg.showModal();
  // al cerrar (botón, Esc o toque fuera) queda la barra para reabrir; si ya se cambió de pantalla, no hace nada
  dlg.onclose = () => { if (dlg.isConnected) $('#nav').classList.remove('oculto'); };
  dlg.onclick = e => { if (e.target === dlg) dlg.close(); };
  const jug = document.querySelector('header .jugador');
  if (jug) jug.innerHTML = `<b>${esc(E.nombre)} ${esc(E.apellido)}</b><br>${aciertos()} de ${TOTAL} aciertos`;
  dlg.showModal();
  $('#retro').scrollTop = 0;
}

// s: el resultado que solo abre la respuesta correcta (salida real, error real, código oculto y memoria final)
function solucion(nv, rt, s) {
  if (rt.tipo === 'clasifica') {
    return `<div class="paso-a-paso"><h2>${ICONO.bien} Por qué así</h2><ul>${rt.items.map((t, k) =>
      `<li><b>${esc(t)}</b>: ${esc(s.porques[k])}</li>`).join('')}</ul></div>`;
  }
  let html = `<div class="paso-a-paso"><h2>${ICONO.codigo} Qué hace Go</h2>`;
  if (rt.tipo === 'error') {
    html += `<div class="msg"><b>Mensaje de Go al ${s.fase === 'compilar' ? 'compilar' : 'ejecutar'}:</b>\n${esc(s.mensaje)}</div>
      <h3 class="sub">Código corregido</h3>${codigoHTML(nv, rt, s.corregida)}`;
  } else if (s.codigo) {
    html += codigoHTML(nv, rt, s.codigo);
  }
  html += terminal(s.salida);
  if (s.despues) {
    html += `<h3 class="sub">${ICONO.memoria} Así queda la memoria</h3>${memoriaHTML(nv.estructura, { nombre: s.despues.variable, valores: s.despues.valores })}`;
  }
  return html + '</div>';
}

function confeti() {
  const c = document.createElement('div'); c.className = 'confeti';
  const colores = ['#EAAA00', '#FFFFFF', '#910048', '#6AD7E5', '#1E9E5A'];
  c.innerHTML = Array.from({ length: 70 }, () => `<i style="left:${Math.random() * 100}%;background:${colores[Math.floor(Math.random() * colores.length)]};animation-duration:${2 + Math.random() * 2.5}s;animation-delay:${Math.random() * .8}s"></i>`).join('');
  document.body.appendChild(c);
  setTimeout(() => c.remove(), 5000);
}

function finNivel(n) {
  const nv = M.niveles[n], est = estrellas(n), bien = aciertosNivel(n);
  const msj = repaso ? 'Repaso terminado. Tu puntaje no cambia.' :
    est === 3 ? '¡Misión perfecta!' : est === 2 ? '¡Muy bien! Casi perfecta.' : est === 1 ? 'Bien. Repasa los porqués antes de la siguiente misión.' : 'Revisa las explicaciones: la siguiente misión usa lo de esta.';
  const siguiente = n + 1 < J.retos.length;
  pintar(`<div class="card fin">${gopherSvg(est >= 2 ? { ojos: 'feliz', boca: 'abierta', casco: true } : { ojos: 'normal', casco: true })}
      <h2 style="justify-content:center">Misión ${n + 1} · ${nv.caso}</h2>
      ${estrellasHTML(est)}
      <p><b>${bien} de ${nRetos(n)}</b> retos correctos al primer intento · ${msj}</p>
      <div class="fila-btn">
        ${siguiente ? `<button class="btn grande" id="sig">Ir a la misión ${n + 2} ${ICONO.sig}</button>` : `<button class="btn grande" id="cert">${ICONO.trofeo} Ver mi certificado</button>`}
      </div>
      <div class="fila-btn"><button class="btn sec" id="mapa">${ICONO.mapa} Volver al mapa</button></div></div>`);
  if (est >= 2 && !repaso) confeti();
  $('#mapa').onclick = mapa;
  if (siguiente) $('#sig').onclick = () => intro(n + 1);
  else $('#cert').onclick = certificado;
}

/* ---------------- certificado ---------------- */
function rango(p) { return p >= 90 ? 'Gopher experto' : p >= 75 ? 'Gopher rescatista' : p >= 50 ? 'Gopher en entrenamiento' : 'Gopher aprendiz'; }
function codigo(texto) {
  let h = 0x811c9dc5;
  for (const ch of texto) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  const s = h.toString(36).toUpperCase().padStart(8, '0').slice(-8);
  return s.slice(0, 4) + '-' + s.slice(4);
}
const cargarImg = src => new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = src; });

async function dibujarCertificado() {
  try { await Promise.all([document.fonts.load('800 60px Poppins'), document.fonts.load('600 30px Poppins'), document.fonts.load('400 28px Poppins')]); } catch { /* sigue con la fuente del sistema */ }
  const W = 1600, H = 1131, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const AZUL = '#002C71', DORADO = '#EAAA00', MAG = '#910048', GRIS = '#4a5461';
  x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#fbf7ec'; x.fillRect(60, 60, W - 120, H - 120);
  x.strokeStyle = DORADO; x.lineWidth = 16; x.strokeRect(28, 28, W - 56, H - 56);
  x.strokeStyle = AZUL; x.lineWidth = 3; x.strokeRect(60, 60, W - 120, H - 120);
  x.fillStyle = DORADO;
  [[60, 60, 1, 1], [W - 60, 60, -1, 1], [60, H - 60, 1, -1], [W - 60, H - 60, -1, -1]].forEach(([a, b, sx, sy]) => {
    x.beginPath(); x.moveTo(a, b); x.lineTo(a + 84 * sx, b); x.lineTo(a, b + 84 * sy); x.closePath(); x.fill();
  });
  // nombre del juego arriba a la izquierda, con la tipografía de la cabecera
  x.textAlign = 'left'; x.font = '800 50px Poppins, sans-serif';
  x.fillStyle = AZUL; x.fillText('Gopher al', 130, 150);
  x.fillStyle = DORADO; x.fillText('Rescate', 130, 206);
  try {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 136" width="240" height="272">${gopher({ ojos: 'feliz', boca: 'abierta', casco: true })}</svg>`;
    const im = await cargarImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
    x.drawImage(im, W - 290, 86, 176, 200);
  } catch { /* sin mascota */ }
  const centro = (txt, y, fuente, color) => { x.font = fuente; x.fillStyle = color; x.textAlign = 'center'; x.fillText(txt, W / 2, y); };
  centro('CERTIFICADO DE LOGRO', 330, '800 66px Poppins, sans-serif', AZUL);
  x.fillStyle = DORADO; x.fillRect(W / 2 - 160, 352, 320, 6);
  centro('Se otorga a', 425, '400 30px Poppins, sans-serif', GRIS);
  const nombre = `${E.nombre} ${E.apellido}`;
  let tam = 78; x.font = `800 ${tam}px Poppins, sans-serif`;
  while (x.measureText(nombre).width > W - 360 && tam > 40) { tam -= 4; x.font = `800 ${tam}px Poppins, sans-serif`; }
  centro(nombre, 515, `800 ${tam}px Poppins, sans-serif`, MAG);
  x.strokeStyle = DORADO; x.lineWidth = 3; x.beginPath(); x.moveTo(W / 2 - 420, 545); x.lineTo(W / 2 + 420, 545); x.stroke();
  centro('por completar las 6 misiones de Gopher al Rescate: arrays, slices y maps en Go', 610, '600 30px Poppins, sans-serif', AZUL);
  centro('[N]T · []T · append · s[ini:fin] · map[K]V · coma ok · delete', 658, '600 24px "JetBrains Mono", Consolas, monospace', GRIS);
  const a = aciertos(), p = Math.round(a / TOTAL * 100);
  const datos = [[`${a} de ${TOTAL}`, 'aciertos'], [`${p} %`, 'de logro'], [rango(p), 'nivel alcanzado']];
  datos.forEach(([v, et], i) => {
    const cx = W / 2 + (i - 1) * 420, y = 736;
    x.fillStyle = i === 2 ? '#fdf2f7' : '#eef3fb'; x.strokeStyle = i === 2 ? MAG : AZUL; x.lineWidth = 2;
    x.beginPath();
    if (x.roundRect) x.roundRect(cx - 190, y, 380, 110, 18); else x.rect(cx - 190, y, 380, 110);
    x.fill(); x.stroke();
    x.textAlign = 'center'; x.fillStyle = i === 2 ? MAG : AZUL;
    let t = 40; x.font = `800 ${t}px Poppins, sans-serif`;
    while (x.measureText(v).width > 350 && t > 22) { t -= 2; x.font = `800 ${t}px Poppins, sans-serif`; }
    x.fillText(v, cx, y + 58);
    x.font = '400 20px Poppins, sans-serif'; x.fillStyle = GRIS; x.fillText(et, cx, y + 92);
  });
  const fecha = new Date().toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' });
  x.textAlign = 'left'; x.fillStyle = GRIS; x.font = '400 24px Poppins, sans-serif';
  // pie: fecha a la izquierda y código de verificación a la derecha, sobre una misma línea
  x.strokeStyle = DORADO; x.lineWidth = 2; x.beginPath(); x.moveTo(130, 935); x.lineTo(W - 130, 935); x.stroke();
  x.fillText(fecha.charAt(0).toUpperCase() + fecha.slice(1), 130, 985);
  x.font = '400 18px Poppins, sans-serif'; x.fillText('Fecha', 130, 1012);
  x.textAlign = 'right'; x.fillStyle = AZUL; x.font = '600 24px "JetBrains Mono", Consolas, monospace';
  x.fillText(codigo(`${nombre}|${a}|${fecha}`), W - 130, 985);
  x.fillStyle = GRIS; x.font = '400 18px Poppins, sans-serif'; x.fillText('Código de verificación', W - 130, 1012);
  return c;
}

async function certificado() {
  if (!todoHecho()) { mapa(); return; }
  pintar(`<div class="card centro"><h2 style="justify-content:center">${ICONO.trofeo} Tu certificado</h2>
      <p class="suave">Generando…</p><div id="certzona"></div></div>`);
  const c = await dibujarCertificado();
  const url = c.toDataURL('image/png');
  const archivo = `Certificado-${E.nombre}-${E.apellido}.png`.replace(/\s+/g, '-');
  $('#certzona').innerHTML = `<img class="cert" src="${url}" alt="Certificado de ${esc(E.nombre)} ${esc(E.apellido)}">
    <div class="fila-btn"><a class="btn grande" id="descargar" href="${url}" download="${esc(archivo)}">${ICONO.descargar} Descargar certificado</a></div>
    <p class="suave">En el celular también puedes mantener presionada la imagen para guardarla.</p>
    <div class="fila-btn"><button class="btn sec" id="mapa">${ICONO.mapa} Volver al mapa</button></div>`;
  document.querySelector('.card .suave').remove();
  $('#mapa').onclick = mapa;
  confeti();
}

/* ---------------- arranque: el mapa y la primera llave salen de la sal pública ---------------- */
async function arrancar() {
  M = await abrirCon(J.mapa, J.sal, 'mapa');
  TOTAL = J.retos.reduce((s, x) => s + x.length, 0);
  K0 = await Cifra.huella(J.sal, 'inicio');
  E = cargar();
  inicio();
}
arrancar();
