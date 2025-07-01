(function($) {

  // --- Utilidades para acordes ---
  var keys = [
    { name: 'LAb',  value: 0,   type: 'F' },
    { name: 'LA',   value: 1,   type: 'N' },
    { name: 'LA#',  value: 2,   type: 'S' },
    { name: 'SIb',  value: 2,   type: 'F' },
    { name: 'SI',   value: 3,   type: 'N' },
    { name: 'DO',   value: 4,   type: 'N' },
    { name: 'DO#',  value: 5,   type: 'S' },
    { name: 'REb',  value: 5,   type: 'F' },
    { name: 'RE',   value: 6,   type: 'N' },
    { name: 'RE#',  value: 7,   type: 'S' },
    { name: 'MIb',  value: 7,   type: 'F' },
    { name: 'MI',   value: 8,   type: 'N' },
    { name: 'FA',   value: 9,   type: 'N' },
    { name: 'FA#',  value: 10,  type: 'S' },
    { name: 'SOLb', value: 10,  type: 'F' },
    { name: 'SOL',  value: 11,  type: 'N' },
    { name: 'SOL#', value: 0,   type: 'S' }
  ];

  function isChord(token) {
    // Solo letras de acorde al inicio del token (ignora minúsculas y sostenidos/bemoles)
    return /^([A-Z]{2,3}(#|b)?[a-zA-Z0-9\/\+\-º°]*)$/.test(token);
  }

  function getKeyByName(name) {
    // Quita el sufijo menor si existe
    if (name.charAt(name.length - 1) == "m" && name.length > 2) {
      name = name.substring(0, name.length - 1);
    }
    for (var i = 0; i < keys.length; i++) {
      if (name === keys[i].name) return keys[i];
    }
    return null;
  }

  function getChordRoot(input) {
    // Distingue SOL vs SOL#, etc.
    if (input.startsWith("SOL")) {
      if (input[3] === "#" || input[3] === "b") return input.substr(0, 4);
      return input.substr(0, 3);
    }
    if (input.length > 2 && (input[2] === "#" || input[2] === "b")) return input.substr(0, 3);
    return input.substr(0, 2);
  }

  function getNewKey(oldKey, delta, targetKey) {
    var base = getKeyByName(oldKey);
    if (!base) return { name: oldKey }; // fallback
    var keyValue = base.value + delta;
    if (keyValue > 11) keyValue -= 12;
    if (keyValue < 0) keyValue += 12;

    // Preferencia por sostenido/bemol según tonalidad objetivo
    if ([0,2,5,7,10].includes(keyValue)) {
      for (var i = 0; i < keys.length; i++) {
        if (keys[i].value == keyValue && keys[i].type == targetKey.type) return keys[i];
      }
      for (var i = 0; i < keys.length; i++) {
        if (keys[i].value == keyValue) return keys[i];
      }
    } else {
      for (var i = 0; i < keys.length; i++) {
        if (keys[i].value == keyValue) return keys[i];
      }
    }
    return { name: oldKey }; // fallback
  }

  function getDelta(oldIndex, newIndex) {
    if (oldIndex > newIndex) return -(oldIndex - newIndex);
    if (oldIndex < newIndex) return (newIndex - oldIndex);
    return 0;
  }

  // --- Procesamiento principal ---
  $.fn.transposePre = function(options) {
    var opts = $.extend({}, $.fn.transposePre.defaults, options);
    var currentKey = null, originalChordBlocks = [];

    var $this = $(this);

    // 1. Parsear las líneas originales, identificar líneas de acordes y guardar bloques
    var originalLines = $this.text().split("\n");
    var parsedLines = [];
    var chordLineIndices = [];

    for (var i = 0; i < originalLines.length; i++) {
      var line = originalLines[i];
      // Considera línea de acordes si todos los tokens son acordes o espacios
      var tokens = line.split(/(\s+)/).filter(Boolean);
      var isChordLine = tokens.some(t => isChord(t)) && tokens.filter(t => t.trim() != "").every(isChord);

      if (isChordLine) {
        chordLineIndices.push(i);
        // Desglosa en bloques acorde+espacios
        var blocks = [];
        var regex = /(\S+)(\s*)/g, match;
        while ((match = regex.exec(line)) !== null) {
          blocks.push({
            acorde: match[1],
            espacios: match[2] || "",
            longitud: (match[1] + (match[2]||"")).length
          });
        }
        originalChordBlocks[i] = blocks;
      }
      parsedLines.push(line);
    }

    // 2. Insertar los enlaces de tonalidad
    var keyLinks = keys.map(function(key) {
      return `<a href='#' class='transpose-link' data-key='${key.name}'>${key.name}</a>`;
    }).join(" ");
    var keysHtml = `<div class='transpose-keys'>${keyLinks}</div>`;
    $this.before(keysHtml);

    // 3. Al hacer click, transponer
    $this.parent().on("click", ".transpose-link", function(e) {
      e.preventDefault();
      var targetKeyName = $(this).data("key");
      var targetKey = getKeyByName(targetKeyName);
      if (!targetKey) return;
      var delta = getDelta(currentKey.value, targetKey.value);

      // Generar líneas transpuestas
      var transposedLines = originalLines.map(function(line, idx) {
        if (!originalChordBlocks[idx]) return line;
        var blocks = originalChordBlocks[idx];
        return blocks.map(function(block) {
          var oldChordRoot = getChordRoot(block.acorde);
          var newChordRoot = getNewKey(oldChordRoot, delta, targetKey);
          var resto = block.acorde.substr(oldChordRoot.length);
          var acordeTransp = newChordRoot.name + resto;
          // Ajustar espacios a la derecha
          var total = acordeTransp.length;
          var espacios = block.longitud - total;
          if (espacios < 0) espacios = 0;
          return acordeTransp + " ".repeat(espacios);
        }).join("");
      });

      $this.text(transposedLines.join("\n"));
      currentKey = targetKey;
      $(".transpose-link").removeClass("selected");
      $(this).addClass("selected");
    });

    // 4. Inicializar
    // Buscar tonalidad inicial
    var startKey = (opts.key || keys[0].name);
    currentKey = getKeyByName(startKey);
    $(".transpose-link[data-key='"+startKey+"']").addClass("selected");
  };

  // -- Defaults --
  $.fn.transposePre.defaults = {
    key: 'LA'
  };

  // --- Inicialización automática ---
  $(function() {
    $("#letra").transposePre();
  });

})(jQuery);