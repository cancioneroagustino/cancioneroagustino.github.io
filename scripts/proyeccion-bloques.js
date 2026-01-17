function isLineaVacia(linea) {
  return linea.trim() === '';
}

function extraerBloquesDesdePre(preHTML) {
  const lineas = preHTML.split('\n');

  const bloques = [];
  let buffer = [];
  let enEstribillo = false;

  function cerrarBloque() {
    if (buffer.length === 0) return;

    bloques.push({
      tipo: enEstribillo ? 'estribillo' : 'estrofa',
      html: buffer.join('<br>')
    });

    buffer = [];
  }

  for (let linea of lineas) {
    if (linea.startsWith('<b>')) {
      cerrarBloque();
      enEstribillo = true;
      linea = linea.replace('<b>', '').trim();
    }

    if (linea.endsWith('</b>')) {
      linea = linea.replace('</b>', '').trim();
      buffer.push(linea);
      cerrarBloque();
      enEstribillo = false;
      continue;
    }

    if (isLineaVacia(linea)) {
      cerrarBloque();
      continue;
    }

    buffer.push(linea);
  }

  cerrarBloque();
  return bloques;
}

function separarBloques(bloques) {
  const estrofas = [];
  const estribillos = [];

  bloques.forEach((b, index) => {
    if (b.tipo === 'estribillo') {
      estribillos.push({ ...b, index });
    } else {
      estrofas.push({ ...b, index });
    }
  });

  return { estrofas, estribillos };
}


function ordenarBloquesParaProyeccion(bloques) {
  const { estrofas, estribillos } = separarBloques(bloques);

  // Caso 0: sin estribillos
  if (estribillos.length === 0) {
    return bloques;
  }

  // Caso 1: múltiples estribillos → respetar orden original
  if (estribillos.length > 1) {
    return bloques;
  }

  // Caso 2 y 3: estribillo único
  const estribillo = estribillos[0];
  const salida = [];

  const esInicial =
    estrofas.length > 0 && estribillo.index < estrofas[0].index;

  if (esInicial) {
    salida.push(estribillo);
  }

  for (const estrofa of estrofas) {
    salida.push(estrofa);
    salida.push(estribillo);
  }

  return salida;
}


function renderCancionPorBloques(titulo, preHTML) {
  const bloques = extraerBloquesDesdePre(preHTML);
  const bloquesOrdenados = ordenarBloquesParaProyeccion(bloques);

  let html = `<h2 class="titulo-cancion">${titulo}</h2>`;

  for (const bloque of bloquesOrdenados) {
    html += `
      <div class="bloque ${bloque.tipo}">
        ${bloque.html}
      </div>
    `;
  }

  return html;
}


async function iniciarProyeccionPorBloques() {
  document.getElementById('configuracion').style.display = 'none';

  const pantalla = document.getElementById('pantalla-proyector');
  pantalla.style.display = 'block';
  pantalla.innerHTML = '';

  for (const item of programa) {
    const response = await fetch(item.cancion);
    const contenido = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(contenido, 'text/html');

    const titulo = doc.querySelector('title')?.innerText || '';
    const preHTML = doc.querySelector('pre')?.innerHTML || '';

    pantalla.innerHTML += renderCancionPorBloques(titulo, preHTML);
  }
}
