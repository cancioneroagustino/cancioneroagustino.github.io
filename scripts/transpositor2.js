(function($) {

    var solfeoToABC = { "DO": "C", "RE": "D", "MI": "E", "FA": "F", "SOL": "G", "LA": "A", "SI": "B" };
    var abcToSolfeo = { "C": "DO", "D": "RE", "E": "MI", "F": "FA", "G": "SOL", "A": "LA", "B": "SI" };

    // 2. Función de determinación de línea de acordes
    var isChordLine = function(line) {
        return /(\bDO|\bRE|\bMI|\bFA|\bSOL|\bLA|\bSI)[b#]?|\bCejillo\b|\bIntro\b|\bIntroducción\b/.test(line);
    };

    function refreshNotation() {
    var isABC = $('#toggleNotationButton').data('format') === 'ABC';
    var map = isABC ? solfeoToABC : abcToSolfeo;
    
    // 1. Traducir acordes en la canción
    $('#letra span.c').each(function() {
        var $el = $(this);
        var oldText = $el.text();
        var newText = oldText;

        // Ordenamos las llaves por longitud (SOL antes que SO) para evitar reemplazos parciales
        var keys = Object.keys(map).sort(function(a, b) { return b.length - a.length; });

        $.each(keys, function(i, orig) {
            // Usamos una comprobación estricta: debe empezar con la nota 
            // Y lo que sigue NO debe ser otra letra de nota (evita procesar dos veces)
            if (oldText.indexOf(orig) === 0) {
                var dest = map[orig];
                newText = dest + oldText.substring(orig.length);
                return false; 
            }
        });

        if (oldText !== newText) {
            var diff = oldText.length - newText.length;
            $el.text(newText);

            var next = $el[0].nextSibling;
            if (next && next.nodeType === 3) {
                var spacesMatch = next.nodeValue.match(/^(\s+)/);
                var currentSpaces = spacesMatch ? spacesMatch[1].length : 0;
                var newSpacesCount = currentSpaces + diff;
                if (newSpacesCount < 0) newSpacesCount = 0;
                next.nodeValue = " ".repeat(newSpacesCount) + next.nodeValue.replace(/^\s+/, "");
            }
        }
    });

    // 2. Traducir los botones del menú (Sin duplicar letras)
    $('.transpose-keys a').each(function() {
        var $el = $(this);
        var text = $el.text();
        var keys = Object.keys(map).sort(function(a, b) { return b.length - a.length; });
        
        $.each(keys, function(i, orig) {
            if (text === orig || text.indexOf(orig) === 0) {
                // Reemplazo total para los botones para que no se acumulen restos
                $el.text(text.replace(orig, map[orig]));
                return false;
            }
        });
    });
}


    $.fn.transpose = function(options) {
        var opts = $.extend({}, $.fn.transpose.defaults, options);
        var currentKey = null;
        var isMinorMode = false;
        
        var keys = [
            { name: 'LAb', value: 0, type: 'F' }, { name: 'LA', value: 1, type: 'N' },
            { name: 'LA#', value: 2, type: 'S' }, { name: 'SIb', value: 2, type: 'F' },
            { name: 'SI', value: 3, type: 'N' }, { name: 'DO', value: 4, type: 'N' },
            { name: 'DO#', value: 5, type: 'S' }, { name: 'REb', value: 5, type: 'F' },
            { name: 'RE', value: 6, type: 'N' }, { name: 'RE#', value: 7, type: 'S' },
            { name: 'MIb', value: 7, type: 'F' }, { name: 'MI', value: 8, type: 'N' },
            { name: 'FA', value: 9, type: 'N' }, { name: 'FA#', value: 10, type: 'S' },
            { name: 'SOLb', value: 10, type: 'F' }, { name: 'SOL', value: 11, type: 'N' },
            { name: 'SOL#', value: 0, type: 'S' }
        ];

        var getKeyByName = function (name) {
            if (name.endsWith("m")) name = name.slice(0, -1);
            for (var i = 0; i < keys.length; i++) {
                if (name == keys[i].name) return keys[i];
            }
        };

        var getChordRoot = function (input) {
            var ind = input.startsWith("SO") ? 3 : 2;
            if (input.length > ind && (input.charAt(ind) == "b" || input.charAt(ind) == "#"))
                return input.substr(0, ind+1);
            return input.substr(0, ind);
        };

        var getNewKey = function (oldKey, delta, targetKey) {
            var keyValue = getKeyByName(oldKey).value + delta;
            if (keyValue > 11) keyValue -= 12; else if (keyValue < 0) keyValue += 12;
            
            var sharpSet = isMinorMode 
                ? ["LA","LA#","SI","DO#","RE#","MI","FA#","SOL#"] 
                : ["LA","LA#","SI","DO","DO#","RE","RE#","MI","FA#","SOL","SOL#"];

            for (var i=0; i<keys.length; i++) {
                if (keys[i].value == keyValue) {
                    if ([0,2,5,7,10].includes(keyValue)) {
                        var expectedType = sharpSet.includes(targetKey.name) ? "S" : "F";
                        if (keys[i].type == expectedType) return keys[i];
                    } else {
                        return keys[i];
                    }
                }
            }
            return getKeyByName(oldKey); // Fallback
        };

        var transposeSong = function (target, keyName) {
            var newKey = getKeyByName(keyName);
            if (!newKey || currentKey.name == newKey.name) return;
            var delta = newKey.value - currentKey.value;
            $("span.c", target).each(function () {
                var el = $(this);
                if (!el.data("orig-block-len")) {
                    var next = el[0].nextSibling;
                    var spaces = (next && next.nodeType === 3) ? (next.nodeValue.match(/^(\s+)/) || ["",""])[1].length : 0;
                    el.data("orig-block-len", el.text().length + spaces);
                }
                var oldChord = el.text();
                var oldRoot = getChordRoot(oldChord);
                var newRoot = getNewKey(oldRoot, delta, newKey);
                var newChord = newRoot.name + oldChord.substr(oldRoot.length);
                var spacesNeeded = Math.max(0, el.data("orig-block-len") - newChord.length);
                el.text(newChord);
                var next = el[0].nextSibling;
                if (next && next.nodeType === 3) {
                    if (!/^[\s]*[\/-]/.test(next.nodeValue)) {
                        next.nodeValue = " ".repeat(spacesNeeded) + next.nodeValue.replace(/^\s+/, "");
                    }
                }
            });
            currentKey = newKey;
        };

        return $(this).each(function() {
            var $this = $(this);
            var startKey = $this.attr("data-key") || opts.key;
            if (!startKey) return;

            isMinorMode = startKey.endsWith("m");
            currentKey = getKeyByName(startKey);

            // Generar Menú Filtrado
            var keyLinks = [];
            var allowed = ['DO', 'REb', 'RE', 'MIb', 'MI', 'FA', 'FA#', 'SOL', 'LAb', 'LA', 'SIb', 'SI'];
            $(keys).each(function(i, k) {
                if (allowed.includes(k.name)) {
                    var sel = (currentKey.name == k.name) ? "class='selected'" : "";
                    keyLinks.push("<a href='#' " + sel + ">" + k.name + "</a>");
                }
            });

            var keysHtml = $("<div class='transpose-keys justify-content-md-center'></div>").html(keyLinks.join(""));
            
            keysHtml.on('click', 'a', function(e) {
                e.preventDefault();
                var $link = $(this);
                var targetText = $link.text();

                // Traducción reversa si estamos en ABC para que el motor entienda
                if ($('#toggleNotationButton').data('format') === 'ABC') {
                    $.each(abcToSolfeo, function(abc, sol) {
                        if (targetText.startsWith(abc)) { targetText = targetText.replace(abc, sol); return false; }
                    });
                    // Reset temporal para transponer
                    $('#toggleNotationButton').data('format', 'Solfeo');
                    refreshNotation();
                    $('#toggleNotationButton').data('format', 'ABC');
                }

                transposeSong($this, targetText);
                $(".transpose-keys a").removeClass("selected");
                $link.addClass("selected");
                refreshNotation();
            });

            $this.before(keysHtml);

            // Procesar texto inicial
            var lines = $this.html().split("\n");
            var output = lines.map(function(line) {
                return "<span>" + (isChordLine(line) ? opts.wrapChords(line) : line) + "</span>";
            });
            $this.html(output.join("\n"));
        });
    };

    $.fn.transpose.defaults = {
        wrapChords: function(input) {
            return input.replace(/((\bDO|\bRE|\bMI|\bFA|\bSOL|\bLA|\bSI)[b\#]?(2|4|5|6|7|9|11|13|6\/9|7\-5|7\-9|7\#5|7\#9|7\+5|7\+9|7b5|7b9|7sus2|7sus4|add2|add4|add9|aug|°|dim|Ø|dim7|mb5|m7b5|m\/maj7|m6|m7|m7b5|m9|m11|m13|maj7|maj9|maj11|maj13|m|sus|sus2|sus4)*)/g, "<span class='c'>$1</span>")
        }
    };

    //Inicialización y Eventos de botones externos
    $(function() {
        // --- INYECCIÓN DE BOTONES ---
        // Creamos el contenedor de botones dinámicamente
        var $buttonContainer = $('<div class="d-flex justify-content-center gap-2 mb-3"></div>');
        
        var $btnChords = $('<button id="toggleChordsButton" class="btn btn-acordes btn-sm" data-bs-toggle="button">Ocultar acordes</button>');
        var $btnNotation = $('<button id="toggleNotationButton" class="btn btn-acordes btn-sm" data-format="Solfeo">Notación ABC</button>');
        
        $buttonContainer.append($btnChords).append($btnNotation);
        
        // Los insertamos antes del div #letra
        $("#letra").before($buttonContainer);

        // --- INICIALIZACIÓN DEL PLUGIN ---
        $("#letra").transpose();

        // --- EVENTOS DE LOS BOTONES INYECTADOS ---
        
        // Botón Mostrar/Ocultar
        $('#toggleChordsButton').click(function() {
            var $btn = $(this);
            var isHidden = $btn.hasClass('active'); // Bootstrap toggle state
            
            $('#letra span').each(function() {
                if (isChordLine($(this).text())) {
                    $(this).toggle();
                }
            });
            
            // Cambiamos el texto según el estado
            $btn.text(isHidden ? "Mostrar acordes" : "Ocultar acordes");
        });

        // Botón Cambio de Notación
        $('#toggleNotationButton').click(function() {
            var $btn = $(this);
            var isCurrentlyABC = $btn.data('format') === 'ABC';
            
            // Cambiamos el estado
            $btn.data('format', isCurrentlyABC ? 'Solfeo' : 'ABC');
            // Cambiamos el texto del botón para indicar qué pasará si se presiona de nuevo
            $btn.text(isCurrentlyABC ? 'Notación ABC' : 'Notación DoReMi');
            
            refreshNotation();
        });
    });

})(jQuery);