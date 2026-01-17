/*
 PROYECCION POR BLOQUES (estrofas / estribillos)
 Reutiliza la misma extracción de programa-texto.html
 Soporta dos modos:
   - incluirAcordes = false  (letra sola)
   - incluirAcordes = true   (letra + acordes)

 NO modifica el flujo de proyección continua existente.
*/

// -------- utilidades base --------

function isChordLine(line) {
  return /(\bDO|\bRE|\bMI|\bFA|\bSOL|\bLA|\bSI)[b#]?/.test(line)
      || /^\s*(Intro|Introducción|Cejillo)\b/.test(line);
}

function limpiarAcordes(texto) {
  return texto
    .split('\n')
    .filter(l => !isChordLine(l))
    .join('\n');
}

// -------- parsing del <pre> --------

function parsearPre(preHTML, incluirAcordes) {
  let texto = preHTML;

  if (!incluirAcordes) {
    const temp = document.createElement('div');
    temp.innerHTML = preHTML;
    texto = limpiarAcordes(temp.textContent);
  }

  const lineas = texto.split('\n');
  const bloques = [];
  let bloqueActual = null;

  for (let linea of lineas) {
    const limpia = linea.trim();

    // línea vacía → cierre de bloque
    if (limpia === '') {
      if (bloqueActual) {
        bloques.push(bloqueActual);
        bloqueActual = null;
      }
      continue;
    }

    const esEstribillo = linea.startsWith('<b>') || linea.includes('<b>');

    if (!bloqueActual) {
      bloqueActual = {
        tipo: esEstribillo ? 'estribillo' : 'estrofa',
        lineas: []
      };
    }

    bloqueActual.lineas.push(linea);
  }

  if (bloqueActual) bloques.push(bloqueActual);

  return bloques;
}

// -------- orden musical --------

function ordenarBloques(bloques) {
  const estribillos = bloques.filter(b => b.tipo === 'estribillo');
  const estrofas   = bloques.filter(b => b.tipo === 'estrofa');

  // múltiples estribillos → respetar orden original
  if (estribillos.length > 1) return bloques;

  // ningún estribillo
  if (estribillos.length === 0) return estrofas;

  const E = estribillos[0];
  const resultado = [];

  // ¿parte con estribillo?
  const iniciaConEstribillo = bloques[0].tipo === 'estribillo';

  if (iniciaConEstribillo) resultado.push(E);

  for (const estrofa of estrofas) {
    resultado.push(estrofa);
    resultado.push(E);
  }

  return resultado;
}

// -------- render --------

function renderBloque(bloque) {
  const div = document.createElement('div');
  div.className = bloque.tipo === 'estribillo'
    ? 'bloque-estribillo'
    : 'bloque-estrofa';

  div.innerHTML = bloque.lineas
    .map(l => l === '' ? '<br>' : l + '<br>')
    .join('');

  return div;
}

// -------- carga de canción --------

async function cargarCancionEnBloques(ruta, incluirAcordes) {
  const response = await fetch(ruta);
  const html = await response.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');

  const titulo = doc.querySelector('h1.titulo')?.innerText || '';
  const pre    = doc.querySelector('pre');

  if (!pre) return [];

  const bloques = parsearPre(pre.innerHTML, incluirAcordes);
  const ordenados = ordenarBloques(bloques);

  return { titulo, bloques: ordenados };
}

// -------- proyección pública --------

async function iniciarProyeccionPorBloques(incluirAcordes = false) {
  document.getElementById('configuracion').style.display = 'none';

  const pantalla = document.getElementById('pantalla-proyector');
  pantalla.style.display = 'block';
  pantalla.innerHTML = '';

  for (const item of programa) {
    const { titulo, bloques } = await cargarCancionEnBloques(item.cancion, incluirAcordes);

    if (titulo) {
      const h2 = document.createElement('h2');
      h2.textContent = titulo;
      pantalla.appendChild(h2);
    }

    for (const bloque of bloques) {
      pantalla.appendChild(renderBloque(bloque));
    }
  }
}
