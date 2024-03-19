(function($) {

  $.fn.transpose = function(options) {
    var opts = $.extend({}, $.fn.transpose.defaults, options);
    
    var currentKey = null;
    
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
      { name: 'SOLb',  value: 10,  type: 'F' },
      { name: 'SOL',   value: 11,  type: 'N' },
      { name: 'SOL#',  value: 0,   type: 'S' }
    ];
  
    var getKeyByName = function (name) {
        if (name.charAt(name.length-1) == "m") {
          name = name.substring(0, name.length-1);
        }
        for (var i = 0; i < keys.length; i++) {
            if (name == keys[i].name) {
                return keys[i];
            }
        }
    };

    var getChordRoot = function (input) {
		var ind = 2;
		console.log("getChordRoot: "+input);
		if(input.substring(0,2)=="SO"){
			//alert("Nota sol");
			ind=3;}
        if (input.length > ind && (input.charAt(ind) == "b" || input.charAt(ind) == "#"))
            return input.substr(0, ind+1);
        else
            return input.substr(0, ind);
    };

    var getNewKey = function (oldKey, delta, targetKey) {
		console.log("oldKey: "+oldKey + " - delta: " + delta);
        var keyValue = getKeyByName(oldKey).value + delta;
console.log(keyValue);
        if (keyValue > 11) {
            keyValue -= 12;
        } else if (keyValue < 0) {
            keyValue += 12;
        }
        
        var i=0;
        if (keyValue == 0 || keyValue == 2 || keyValue == 5 || keyValue == 7 || keyValue == 10) {
            // Return the Flat or Sharp Key
			//console.log("targetKey: "+targetKey.name);
            switch(targetKey.name) {
              case "LA":
              case "LA#":
              case "SI":
              case "DO#":
              case "RE#":
              case "MI":
              case "FA#":
              case "SOL#":
                  for (;i<keys.length;i++) {
                    if (keys[i].value == keyValue && keys[i].type == "S") {
                      return keys[i];
                    }
                  }
              default:
                  for (;i<keys.length;i++) {
                    if (keys[i].value == keyValue && keys[i].type == "F") {
                      return keys[i];
                    }
                  }
            }
        }
        else {
            // Return the Natural Key
            for (;i<keys.length;i++) {
              if (keys[i].value == keyValue) {
                return keys[i];
              }
            }
        }
    };

    var getChordType = function (key) {
        switch (key.charAt(key.length - 1)) {
            case "b":
                return "F";
            case "#":
                return "S";
            default:
              return "N";
        }
    };

    var getDelta = function (oldIndex, newIndex) {
        if (oldIndex > newIndex)
            return 0 - (oldIndex - newIndex);
        else if (oldIndex < newIndex)
            return 0 + (newIndex - oldIndex);
        else
            return 0;
    };

    var transposeSong = function (target, key) {
        var newKey = getKeyByName(key);

        if (currentKey.name == newKey.name) {
          return;
        }

        var delta = getDelta(currentKey.value, newKey.value);
        
        $("span.c", target).each(function (i, el) {
            transposeChord(el, delta, newKey);
        });
        
        currentKey = newKey;
    };

    var transposeChord = function (selector, delta, targetKey) {
        var el = $(selector);
        var oldChord = el.text();
        var oldChordRoot = getChordRoot(oldChord);
        var newChordRoot = getNewKey(oldChordRoot, delta, targetKey);
        var newChord = newChordRoot.name + oldChord.substr(oldChordRoot.length);
		console.log("newChord: "+newChord);
        el.text(newChord);

        var sib = el[0].nextSibling;
        if (sib && sib.nodeType == 3 && sib.nodeValue.length > 0 && sib.nodeValue.charAt(0) != "/") {
            var wsLength = getNewWhiteSpaceLength(oldChord.length, newChord.length, sib.nodeValue.length);
            sib.nodeValue = makeString(" ", wsLength);
        }
    };

    var getNewWhiteSpaceLength = function (a, b, c) {
        if (a > b)
            return (c + (a - b));
        else if (a < b)
            return (c - (b - a));
        else
            return c;
    };

    var makeString = function (s, repeat) {
        var o = [];
        for (var i = 0; i < repeat; i++) o.push(s);
        return o.join("");
    }
    

    
    var wrapChords = function (input) {
        return input.replace(opts.chordReplaceRegex, "<span class='c'>$1</span>");
    };
    
    
    return $(this).each(function() {
    
      var startKey = $(this).attr("data-key");
      if (!startKey || $.trim(startKey) == "") {
        startKey = opts.key;
      }

      if (!startKey || $.trim(startKey) == "") {
        throw("Starting key not defined.");
        return this;
      }
      
      currentKey = getKeyByName(startKey);

      // Build tranpose links ===========================================
      var keyLinks = [];
      $(keys).each(function(i, key) {
          if (currentKey.name == key.name)
              keyLinks.push("<a href='#' class='selected'>" + key.name + "</a>");
          else
              keyLinks.push("<a href='#'>" + key.name + "</a>");
      });


      var $this = $(this);
      var keysHtml = $("<div class='transpose-keys col-12'></div>");
      keysHtml.html(keyLinks.join(""));
      $("a", keysHtml).click(function(e) {
          e.preventDefault();
          transposeSong($this, $(this).html());
          $(".transpose-keys a").removeClass("selected");
          $(this).addClass("selected");
          return false;
      });
      
      $(this).before(keysHtml);

      var output = [];
      var lines = $(this).html().split("\n");
      var line, tmp = "";

      for (var i = 0; i < lines.length; i++) {
          line = lines[i];
              output.push("<span>" + wrapChords(line) + "</span>");
      };

      $(this).html(output.join("\n"));
    });
  };


  $.fn.transpose.defaults = {
    chordRegex: /^(\bDO|\bRE|\bMI|\bFA|\bSOL|\bLA|\bSI)[b\#]?(2|4|5|6|7|9|11|13|6\/9|7\-5|7\-9|7\#5|7\#9|7\+5|7\+9|7b5|7b9|7sus2|7sus4|add2|add4|add9|aug|dim|dim7|mb5|m7b5|m\/maj7|m6|m7|m7b5|m9|m11|m13|maj7|maj9|maj11|maj13|m|sus|sus2|sus4)*(\/[A-G][b\#]*)*$/,
    chordReplaceRegex: /((\bDO|\bRE|\bMI|\bFA|\bSOL|\bLA|\bSI)[b\#]?(2|4|5|6|7|9|11|13|6\/9|7\-5|7\-9|7\#5|7\#9|7\+5|7\+9|7b5|7b9|7sus2|7sus4|add2|add4|add9|aug|dim|dim7|mb5|m7b5|m\/maj7|m6|m7|m7b5|m9|m11|m13|maj7|maj9|maj11|maj13|m|sus|sus2|sus4)*)/g
  };

	
	
})(jQuery);
