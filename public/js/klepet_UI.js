function divElementEnostavniTekst(sporocilo) {
  var jeSmesko = sporocilo.indexOf('http://sandbox.lavbic.net/teaching/OIS/gradivo/') > -1;
  var jeSlika = sporocilo.match(/http[s]?:\/\/(\S+)(.png|.jpg|.gif)/g);
  var jeVideo = sporocilo.match(/https:\/\/www.youtube.com\/watch\?v(\S+)/g);
  if (jeSmesko || (jeSlika != null) || (jeVideo != null)) {
    sporocilo = sporocilo
                .replace(/\</g, '&lt;')
                .replace(/\>/g, '&gt;')
                .replace(/&lt;img/g, '<img')
                .replace(/&lt;br&gt;/g, '<br>')
                .replace('png\' /&gt;', 'png\' />')
                .replace('jpg\' /&gt;', 'jpg\' />')
                .replace('gif\' /&gt;', 'gif\' />')
                .replace(/&lt;iframe/g, '<iframe')
                .replace(/allowfullscreen&gt;&lt;\/iframe&gt;/g, 'allowfullscreen></iframe');
    return $('<div style="font-weight: bold"></div>').html(sporocilo);
  } else {
    return $('<div style="font-weight: bold;"></div>').text(sporocilo);
  }
}

function divElementHtmlTekst(sporocilo) {
  return $('<div></div>').html('<i>' + sporocilo + '</i>');
}

function procesirajVnosUporabnika(klepetApp, socket) {
  var sporocilo = $('#poslji-sporocilo').val();
  sporocilo = dodajSmeske(sporocilo);
  sporocilo = dodajSliko(sporocilo);
  sporocilo = dodajVideo(sporocilo);
  var sistemskoSporocilo;

  if (sporocilo.charAt(0) == '/') {
    sistemskoSporocilo = klepetApp.procesirajUkaz(sporocilo);
    if (sistemskoSporocilo) {
      $('#sporocila').append(divElementHtmlTekst(sistemskoSporocilo));
    }
  } else {
    sporocilo = filtirirajVulgarneBesede(sporocilo);
    klepetApp.posljiSporocilo(trenutniKanal, sporocilo);
    $('#sporocila').append(divElementEnostavniTekst(sporocilo));
    $('#sporocila').scrollTop($('#sporocila').prop('scrollHeight'));
  }

  $('#poslji-sporocilo').val('');
}

var socket = io.connect();
var trenutniVzdevek = "", trenutniKanal = "";

var vulgarneBesede = [];
$.get('/swearWords.txt', function(podatki) {
  vulgarneBesede = podatki.split('\r\n');
});

function filtirirajVulgarneBesede(vhod) {
  for (var i in vulgarneBesede) {
    vhod = vhod.replace(new RegExp('\\b' + vulgarneBesede[i] + '\\b', 'gi'), function() {
      var zamenjava = "";
      for (var j=0; j < vulgarneBesede[i].length; j++)
        zamenjava = zamenjava + "*";
      return zamenjava;
    });
  }
  return vhod;
}

$(document).ready(function() {
  var klepetApp = new Klepet(socket);

  socket.on('vzdevekSpremembaOdgovor', function(rezultat) {
    var sporocilo;
    if (rezultat.uspesno) {
      trenutniVzdevek = rezultat.vzdevek;
      $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
      sporocilo = 'Prijavljen si kot ' + rezultat.vzdevek + '.';
    } else {
      sporocilo = rezultat.sporocilo;
    }
    $('#sporocila').append(divElementHtmlTekst(sporocilo));
  });

  socket.on('pridruzitevOdgovor', function(rezultat) {
    trenutniKanal = rezultat.kanal;
    $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
    $('#sporocila').append(divElementHtmlTekst('Sprememba kanala.'));
  });

  socket.on('sporocilo', function (sporocilo) {
    var novElement = divElementEnostavniTekst(sporocilo.besedilo);
    $('#sporocila').append(novElement);
  });
  
  socket.on('kanali', function(kanali) {
    $('#seznam-kanalov').empty();

    for(var kanal in kanali) {
      kanal = kanal.substring(1, kanal.length);
      if (kanal != '') {
        $('#seznam-kanalov').append(divElementEnostavniTekst(kanal));
      }
    }

    $('#seznam-kanalov div').click(function() {
      klepetApp.procesirajUkaz('/pridruzitev ' + $(this).text());
      $('#poslji-sporocilo').focus();
    });
  });

  socket.on('uporabniki', function(uporabniki) {
    $('#seznam-uporabnikov').empty();
    for (var i=0; i < uporabniki.length; i++) {
      $('#seznam-uporabnikov').append(divElementEnostavniTekst(uporabniki[i]));
    }

    //dopolnjena implementacija zasebnih sporocil
    $("#seznam-uporabnikov div").click(function() {
      $('#poslji-sporocilo').val("/zasebno \"" + $(this).text() + "\"");
      $('#poslji-sporocilo').focus();
    });
  });

  socket.on('dregljaj', function(sporocilo) {
    $('#vsebina').jrumble();
    $('#vsebina').trigger('startRumble');
    setTimeout(function() {
      $('#vsebina').trigger('stopRumble');
    }, 1500);
  });

  setInterval(function() {
    socket.emit('kanali');
    socket.emit('uporabniki', {kanal: trenutniKanal});
  }, 1000);

  $('#poslji-sporocilo').focus();

  $('#poslji-obrazec').submit(function() {
    procesirajVnosUporabnika(klepetApp, socket);
    return false;
  });
});



function dodajSmeske(vhodnoBesedilo) {
  var preslikovalnaTabela = {
    ";)": "wink.png",
    ":)": "smiley.png",
    "(y)": "like.png",
    ":*": "kiss.png",
    ":(": "sad.png"
  }
  for (var smesko in preslikovalnaTabela) {
    vhodnoBesedilo = vhodnoBesedilo.replace(smesko,
      "<img src='http://sandbox.lavbic.net/teaching/OIS/gradivo/" +
      preslikovalnaTabela[smesko] + "' />");
  }
  return vhodnoBesedilo;
}

function dodajSliko(vhodnoBesedilo) {
  var povezava = vhodnoBesedilo.match(/http[s]?:\/\/(\S+)(.png|.jpg|.gif)/g);
  if (povezava != null) {
    for (var i = 0; i < povezava.length; i++) {
        vhodnoBesedilo = vhodnoBesedilo + "<br> <img hspace='20' width='200' src='" + povezava[i] + "' />";
    }
  }
  return vhodnoBesedilo;
}  
        
function dodajVideo(vhodnoBesedilo) {
  var povezava = vhodnoBesedilo.match(/https:\/\/www.youtube.com\/watch\?v(\S+)/g);
  if (povezava != null) {
    for (var i = 0; i < povezava.length; i++) {
      vhodnoBesedilo = vhodnoBesedilo + "<br><iframe src='https://www.youtube.com/embed/"+ povezava[i].substring(32) +"' width='200' height='150' style='margin-left:20px' allowfullscreen></iframe>";
    }
  }
  return vhodnoBesedilo;
}