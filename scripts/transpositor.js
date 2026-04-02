(function($) {

    var solfeoToABC = { "DO": "C", "RE": "D", "MI": "E", "FA": "F", "SOL": "G", "LA": "A", "SI": "B" };
    var abcToSolfeo = { "C": "DO", "D": "RE", "E": "MI", "F": "FA", "G": "SOL", "A": "LA", "B": "SI" };

    // --- CAPA VISUAL: SOBRESCRIBE SIN DEJAR RASTROS ---
    window.refreshNotation = function() {
        var isABC = $('#toggleNotationButton').data('format') === 'ABC';
        
        // 1. Actualizar acordes en la canción
        $('span.c').each(function() {
            var $el = $(this);
            // Prioridad al dato guardado internamente (siempre en Solfeo)
            var currentChord = $el.data('current-chord') || $el.text();
            var displayChord = currentChord;

            if (isABC) {
                $.each(solfeoToABC, function(sol, abc) {
                    if (currentChord.indexOf(sol) === 0) {
                        displayChord = currentChord.replace(sol, abc);
                        return false;
                    }
                });
            }
            
            // Calculamos desplazamiento antes de sobrescribir
            var diff = $el.text().length - displayChord.length;
            $el.text(displayChord);

            // Ajuste de espacios (mantenemos tu lógica de alineación)
            var next = $el[0].nextSibling;
            if (next && next.nodeType === 3) {
                var spacesMatch = next.nodeValue.match(/^(\s+)/);
                var currentSpaces = spacesMatch ? spacesMatch[1].length : 0;
                var newSpacesCount = Math.max(0, currentSpaces + diff);
                next.nodeValue = " ".repeat(newSpacesCount) + next.nodeValue.replace(/^\s+/, "");
            }
        });

        // 2. Actualizar botones de tonalidad (Uso de data-original-note para evitar escaneo)
        $('.transpose-keys a').each(function() {
            var $el = $(this);
            var note = $el.data('original-note'); 
            var displayNote = note;

            if (isABC) {
                $.each(solfeoToABC, function(sol, abc) {
                    if (note.indexOf(sol) === 0) {
                        displayNote = note.replace(sol, abc);
                        return false;
                    }
                });
            }
            $el.text(displayNote);
        });
    }

    var isChordLine = function(line) {
        return /(\bDO|\bRE|\bMI|\bFA|\bSOL|\bLA|\bSI)[b#]?|\bCejillo\b|\bIntro\b|\bIntroducción\b/.test(line);
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
            if (name.endsWith("m")) name = name.substring(0, name.length-1);
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
            var sharpSet = isMinorMode ? ["LA","LA#","SI","DO#","RE#","MI","FA#","SOL#"] : ["LA","LA#","SI","DO","DO#","RE","RE#","MI","FA#","SOL","SOL#"];
            for (var i=0; i<keys.length; i++) {
                if (keys[i].value == keyValue) {
                    if ([0,2,5,7,10].includes(keyValue)) {
                        var type = sharpSet.indexOf(targetKey.name) !== -1 ? "S" : "F";
                        if (keys[i].type == type) return keys[i];
                    } else return keys[i];
                }
            }
        };

        var transposeSong = function (target, key) {
    var newKey = getKeyByName(key);
    if (!currentKey || currentKey.name == newKey.name) return;
    
    // Cálculo de delta simple pero efectivo
    var delta = newKey.value - currentKey.value;
    
    $(target).find("span.c").each(function (i, el) { // Cambiado a .find para mayor precisión
        var $el = $(el);
        var oldChord = $el.data('current-chord') || $el.text();
        var oldRoot = getChordRoot(oldChord);
        var newRoot = getNewKey(oldRoot, delta, newKey);
        var newChord = newRoot.name + oldChord.substr(oldRoot.length);
        
        $el.data('current-chord', newChord);
    });
    currentKey = newKey;
    window.refreshNotation(); // Llamamos a la versión global
};

        return $(this).each(function() {
            var $this = $(this);
            var startKey = $this.attr("data-key") || opts.key;
            isMinorMode = startKey.endsWith("m");
            currentKey = getKeyByName(startKey);

            var keyLinks = [];
            var allowed = ['DO', 'REb', 'RE', 'MIb', 'MI', 'FA', 'FA#', 'SOLb', 'SOL', 'LAb', 'LA', 'SIb', 'SI'];
            $(keys).each(function(i, key) {
                if (allowed.indexOf(key.name) !== -1) {
                    var sel = (currentKey.name == key.name) ? "class='selected'" : "";
                    // Guardamos la nota original para que el botón no se "contamine"
                    keyLinks.push("<a href='#' " + sel + " data-original-note='" + key.name + "'>" + key.name + "</a>");
                }
            });

            var keysHtml = $("<div class='transpose-keys justify-content-md-center'></div>").html(keyLinks.join(""));
            keysHtml.find("a").click(function(e) {
                e.preventDefault();
                transposeSong($this, $(this).data('original-note'));
                $(".transpose-keys a").removeClass("selected");
                $(this).addClass("selected");
                return false;
            });

            $this.before(keysHtml);

            var output = [];
            var lines = $this.html().split("\n");
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];
                if (isChordLine(line)) {
                    var wrapped = line.replace(opts.chordReplaceRegex, function(match) {
                        return "<span class='c' data-current-chord='" + match + "'>" + match + "</span>";
                    });
                    output.push("<span>" + wrapped + "</span>");
                } else output.push("<span>" + line + "</span>");
            }
            $this.html(output.join("\n"));
        });
    };

    $.fn.transpose.defaults = {
        key: "DO",
        chordReplaceRegex: /((\bDO|\bRE|\bMI|\bFA|\bSOL|\bLA|\bSI)[b\#]?(2|4|5|6|7|9|11|13|6\/9|7\-5|7\-9|7\#5|7\#9|7\+5|7\+9|7b5|7b9|7sus2|7sus4|add2|add4|add9|aug|°|dim|Ø|dim7|mb5|m7b5|m\/maj7|m6|m7|m7b5|m9|m11|m13|maj7|maj9|maj11|maj13|m|sus|sus2|sus4)*)/g
    };

    $(function() {
        var $letra = $("#letra");
        if ($letra.length) {
            var $container = $('<div class="d-flex justify-content-center gap-2 mb-3"></div>');
            var $btnChords = $('<button id="toggleChordsButton" class="btn btn-acordes btn-sm">Ocultar acordes</button>');
            var $btnNotation = $('<button id="toggleNotationButton" class="btn btn-acordes btn-sm" data-format="Solfeo">Notación ABC</button>');
            $container.append($btnChords).append($btnNotation);
            $letra.before($container);

            $letra.transpose();

            $('#toggleChordsButton').click(function() {
                var isHidden = $(this).data('hidden');
                $('#letra span').each(function() {
                    if (isChordLine($(this).text())) $(this).toggle(!!isHidden);
                });
                $(this).data('hidden', !isHidden).text(isHidden ? "Ocultar acordes" : "Mostrar acordes");
            });

            $('#toggleNotationButton').click(function() {
                var isABC = $(this).data('format') === 'ABC';
                $(this).data('format', isABC ? 'Solfeo' : 'ABC').text(isABC ? 'Notación ABC' : 'Notación DoReMi');
                refreshNotation();
            });
        }
    });

})(jQuery);