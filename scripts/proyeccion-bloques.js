/***************************************
 *  UTILIDADES BÁSICAS
 ***************************************/

function isChordLine(line) {
  return /(\bDO|\bRE|\bMI|\bFA|\bSOL|\bLA|\bSI)[b#]?|\bCejillo\b|\bIntro\b|\bIntroducción\b/.test(line);
}

function limpiarAcordes(preHTML) {
  return preHTML
    .split('\n')
    .filter(l => !isChordLine(l.trim()))
    .join('\n');
}

function obtenerTexto(preHTML, incluirAcordes) {
  return incluirAcordes ? preHTML : limpiarAcordes(preHTML);
}

/***************************************
 *  CONSTRUCTOR DE BLOQUES
 ***************************************/

function construirBloquesCancion(preHTML, titulo, incluirAcordes) {
  const texto = obtenerTexto(preHTML, incluirAcordes);
  const lineas = texto.split('\n');

  const bloques = [];
  let bloqueActual = [];
  let esEstribilloActual = false;
  let estribillos = [];

  function cerrarBloque() {
    if (bloqueActual.length === 0) return;
    bloques.push({
      tipo: esEstribilloActual ? 'estribillo' : 'estrofa',
      contenido: bloqueActual.join('\n')
    });
    bloqueActual = [];
  }

  for (let linea of lineas) {
    const limpia = linea.trim();

    // Línea vacía → separación de bloques
    if (limpia === '') {
      cerrarBloque();
      esEstribilloActual = false;
      continue;
    }

    // Inicio de estribillo
    if (limpia.startsWith('<b>')) {
      cerrarBloque();
      esEstribilloActual = true;
    }

    bloqueActual.push(linea);

    // Fin de estribillo
    if (limpia.endsWith('</b>')) {
      cerrarBloque();
      esEstribilloActual = false;
    }
  }

  cerrarBloque();

  // identificar estribillos
  estribillos = bloques.filter(b => b.tipo === 'estribillo');

  // Caso: múltiples estribillos → se respeta orden original
  if (estribillos.length !== 1) {
    return [{ tipo: 'titulo', contenido: titulo }, ...bloques];
  }

  // Caso: un solo estribillo → reconstrucción litúrgica
  const estribillo = estribillos[0];
  const estrofas = bloques.filter(b => b.tipo === 'estrofa');

  const resultado = [];
  resultado.push({ tipo: 'titulo', contenido: titulo });

  const estribilloPrimero = bloques[0].tipo === 'estribillo';

  if (estribilloPrimero) {
    resultado.push(estribillo);
  }

  for (let estrofa of estrofas) {
    resultado.push(estrofa);
    resultado.push(estribillo);
  }

  return resultado;
}

/***************************************
 *  CARGA DE CANCIÓN
 ***************************************/

async function cargarCancionBloques(ruta, incluirAcordes) {
  const response = await fetch(ruta);
  const html = await response.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');

  const titulo = doc.querySelector('h1.titulo')?.innerText || '';
  const pre = doc.querySelector('pre');

  if (!pre) return [];

  return construirBloquesCancion(pre.innerHTML, titulo, incluirAcordes);
}

/***************************************
 *  PROYECCIÓN
 ***************************************/

async function iniciarProyeccionPorBloques(incluirAcordes = false) {
  document.getElementById('configuracion').style.display = 'none';

  const pantalla = document.getElementById('pantalla-proyector');
  pantalla.style.display = 'block';
  pantalla.innerHTML = '';

  for (const item of programa) {
    const bloques = await cargarCancionBloques(item.cancion, incluirAcordes);

    for (const bloque of bloques) {
      const div = document.createElement('div');

      if (bloque.tipo === 'titulo') {
        div.innerHTML = `<h2>${bloque.contenido}</h2>`;
      } else {
        div.className = 'letra-normal';
        div.innerHTML = bloque.contenido
          .split('\n')
          .map(l => l === '' ? '<br>' : `${l}<br>`)
          .join('');
      }

      pantalla.appendChild(div);
    }
  }
}



<script>
/* ======================================================
   ESTADO GLOBAL DE PROYECCIÓN
====================================================== */

let bloquesProyeccion = [];
let indiceActual = 0;


/* ======================================================
   RENDER
====================================================== */

function mostrarBloque(i) {
  const pantalla = document.getElementById('pantalla-proyector');
  if (!bloquesProyeccion[i]) return;

  pantalla.innerHTML = '';
  pantalla.appendChild(bloquesProyeccion[i]);
}


/* ======================================================
   NAVEGACIÓN
====================================================== */

function avanzarBloque() {
  if (indiceActual < bloquesProyeccion.length - 1) {
    indiceActual++;
    mostrarBloque(indiceActual);
  }
}

function retrocederBloque() {
  if (indiceActual > 0) {
    indiceActual--;
    mostrarBloque(indiceActual);
  }
}


/* ======================================================
   TECLADO (PC / PEDAL)
====================================================== */

document.addEventListener('keydown', e => {
  const pantallaVisible =
    document.getElementById('pantalla-proyector').style.display === 'block';

  if (!pantallaVisible) return;

  if (['ArrowRight', 'ArrowDown', ' ', 'Enter'].includes(e.key)) {
    avanzarBloque();
    e.preventDefault();
  }

  if (['ArrowLeft', 'ArrowUp', 'Backspace'].includes(e.key)) {
    retrocederBloque();
    e.preventDefault();
  }
});


/* ======================================================
   TOUCH (SWIPE)
====================================================== */

let touchStartX = 0;

document.addEventListener('touchstart', e => {
  touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener('touchend', e => {
  const deltaX = e.changedTouches[0].screenX - touchStartX;

  if (Math.abs(deltaX) < 50) return;

  if (deltaX < 0) avanzarBloque();
  else retrocederBloque();
});


/* ======================================================
   BOTONES EN PANTALLA (CELULAR)
====================================================== */

function mostrarControlesProyeccion() {
  const controles = document.getElementById('controles-proyeccion');
  if (controles) controles.style.display = 'flex';
}

function ocultarControlesProyeccion() {
  const controles = document.getElementById('controles-proyeccion');
  if (controles) controles.style.display = 'none';
}


/* ======================================================
   INICIO DE PROYECCIÓN (PUNTO DE ENTRADA)
====================================================== */

async function iniciarProyeccionPorBloques() {
  document.getElementById('configuracion').style.display = 'none';

  const pantalla = document.getElementById('pantalla-proyector');
  pantalla.style.display = 'block';
  pantalla.innerHTML = '';

  // 👉 ESTA FUNCIÓN YA LA TIENES DEFINIDA
  // 👉 Aquí sólo la invocamos
  bloquesProyeccion = await construirBloquesDesdePrograma(programa);

  indiceActual = 0;
  mostrarBloque(indiceActual);
  mostrarControlesProyeccion();
}
