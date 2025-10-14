/**
 * Code.gs - Apps Script for Industrial Training Form
 *
 * ⚠️ IMPORTANT: Replace the placeholders below with your actual IDs when ready:
 *   - LOGO_FILE_ID: the Drive file ID of your horizontal logo (optional)
 *   - SHEET_ID: (optional) the ID of the Google Sheet to log submissions
 *
 * The script supports:
 *  - doGet: serves the Formulario.html inside Apps Script (so one URL hosts the form)
 *  - doPost: receives form submissions, creates a folder per client inside "Industrial Training",
 *            saves datos.txt, firma.png and generates a PDF with the data and embedded logo.
 *  - logs entries into a Google Sheet (creates one if SHEET_ID left empty)
 *
 * Deploy as "Web app" (Execute as: Me; Access: Anyone, even anonymous) for public form usage.
 */

// ⚙️ SUSTITUIR: coloca aquí el File ID de tu logo (opcional). Deja vacío '' si no quieres logo en PDF.
const LOGO_FILE_ID = '1wQ62DvlX4-DIwBkPj5Hg9-cpQvhPbcF7'; // ⚙️ Sustituir LOGO_FILE_ID aquí

// ⚙️ SUSTITUIR: coloca aquí el ID de la Google Sheet donde quieres registrar los envíos (opcional).
const SHEET_ID = ''; // ⚙️ Sustituir SHEET_ID aquí

const MAIN_FOLDER_NAME = 'Industrial Training';

/**
 * doGet - sirve el formulario HTML incluido en el proyecto (archivo 'Formulario')
 */
function doGet(e) {
  const template = HtmlService.createTemplateFromFile('formulario');
  template.scriptURL = ScriptApp.getService().getUrl(); // ✅ Inyecta la URL
  return template.evaluate()
    .setTitle('Ficha Inscripción - Industrial Training')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


/**
 * doPost - procesa envíos:
 *  - crea carpeta principal si no existe
 *  - crea carpeta por cliente (Nombre_Apellidos_DNI)
 *  - guarda datos.txt, firma.png (si viene) y genera PDF con datos+firma+logo
 *  - añade una fila en la Sheet de registros con enlaces
 */
function doPost(e) {
  try {
    // Normalizar parámetros
    var params = {};
    if (e.parameter) {
      for (var k in e.parameter) {
        params[k] = e.parameter[k];
      }
    }
    if (e.parameters) {
      for (var k in e.parameters) {
        if (Array.isArray(e.parameters[k])) params[k] = e.parameters[k][0];
      }
    }

    var nombre = params.nombre || '';
    var apellidos = params.apellidos || '';
    var dni = params.dni || '';
    var fecha_nacimiento = params.fecha_nacimiento || '';
    var direccion = params.direccion || '';
    var direccion2 = params.direccion2 || '';
    var ciudad = params.ciudad || '';
    var estado = params.estado || '';
    var cp = params.cp || '';
    var telefono = params.telefono || '';
    var email = params.email || '';
    var cuota = params.cuota || '';
    var imagen = params.imagen || '';
    var pago = params.pago || '';
    var iban = params.iban || '';
    var fecha_actual = params.fecha_actual || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");

    // Carpeta principal
    var mainFolder = DriveApp.getFoldersByName(MAIN_FOLDER_NAME).hasNext()
                     ? DriveApp.getFoldersByName(MAIN_FOLDER_NAME).next()
                     : DriveApp.createFolder(MAIN_FOLDER_NAME);

    // Carpeta cliente
    var safeName = sanitizeFilename(((nombre+'_'+apellidos+'_'+dni).trim()) || ('cliente_' + new Date().getTime()));
    var clienteFolder = mainFolder.createFolder(safeName);

    // Crear datos.txt
    var contenido =
      'Nombre: ' + nombre + '\n' +
      'Apellidos: ' + apellidos + '\n' +
      'DNI: ' + dni + '\n' +
      'Fecha de Nacimiento: ' + fecha_nacimiento + '\n' +
      'Dirección: ' + direccion + (direccion2 ? (' / ' + direccion2) : '') + '\n' +
      'Ciudad: ' + ciudad + '\n' +
      'Estado/Provincia: ' + estado + '\n' +
      'Código Postal: ' + cp + '\n' +
      'Teléfono: ' + telefono + '\n' +
      'Email: ' + email + '\n' +
      'Cuota: ' + cuota + '\n' +
      'Derechos de imagen: ' + imagen + '\n' +
      'Opción de pago: ' + pago + '\n' +
      'IBAN: ' + iban + '\n' +
      'Fecha (envío): ' + fecha_actual + '\n';
    var datosFile = clienteFolder.createFile('datos.txt', contenido, MimeType.PLAIN_TEXT);

    // Guardar firma (dataURL base64)
    var firmaUrl = params.firma || '';
    var firmaFile = null;
    if (firmaUrl && firmaUrl.indexOf('base64,') > -1) {
      var b64 = firmaUrl.split('base64,')[1];
      var blob = Utilities.newBlob(Utilities.base64Decode(b64), 'image/png', 'firma.png');
      firmaFile = clienteFolder.createFile(blob);
    }

    // Guardar formulario.html
    var htmlForm=params.formulario_html||'';
    if(!htmlForm){
      htmlForm='<!DOCTYPE html><html><head><meta charset="utf-8"><title>Formulario</title></head><body>';
      for(var key in params) if(key!=='firma' && key!=='formulario_html') htmlForm+='<p><b>'+key+':</b> '+params[key]+'</p>';
      htmlForm+='</body></html>';
    }
    clienteFolder.createFile('formulario.html',htmlForm,MimeType.HTML);

    // Generar HTML para PDF
    var html = '<!doctype html><html><head><meta charset="utf-8"><style>' +
               'body{font-family: Poppins, Open Sans, Arial, sans-serif; padding:24px; color:#222}' +
               '.container{max-width:760px;margin:0 auto;background:#ffffff;padding:20px;border-radius:10px;}' +
               '.header{ text-align:center;margin-bottom:18px }' +
               '.logo{ max-width:220px; margin-bottom:8px }' +
               '.titulo{ font-size:20px; font-weight:700; margin-bottom:8px }' +
               '.campo{ margin:8px 0 } .etq{font-weight:700;color:#333}' +
               '.firma{ margin-top:18px }' +
               '</style></head><body><div class="container">';

    // Logo (convertir a dataURL si LOGO_FILE_ID configurado)
    if (LOGO_FILE_ID && LOGO_FILE_ID.length > 3) {
      try {
        var logoFile = DriveApp.getFileById(LOGO_FILE_ID);
        var logoBlob = logoFile.getBlob();
        var logoDataUrl = 'data:' + logoBlob.getContentType() + ';base64,' + Utilities.base64Encode(logoBlob.getBytes());
        html += '<div class="header"><img src="' + logoDataUrl + '" class="logo"/></div>';
      } catch (err) {
        // ignorar si falla
      }
    }

    html += '<div class="header"><div class="titulo">Ficha de Inscripción - Industrial Training</div></div>';

    function addLine(label, val) { html += '<div class="campo"><span class="etq">' + label + ':</span> ' + (val||'') + '</div>'; }
    addLine('Nombre', nombre);
    addLine('Apellidos', apellidos);
    addLine('DNI', dni);
    addLine('Fecha de Nacimiento', fecha_nacimiento);
    addLine('Dirección', direccion + (direccion2 ? (' / ' + direccion2) : ''));
    addLine('Ciudad', ciudad);
    addLine('Estado/Provincia', estado);
    addLine('Código Postal', cp);
    addLine('Teléfono', telefono);
    addLine('Email', email);
    addLine('Cuota', cuota);
    addLine('Derechos de imagen', imagen);
    addLine('Opción de pago', pago);
    addLine('IBAN', iban);
    addLine('Fecha (envío)', fecha_actual);

    if (firmaUrl && firmaUrl.indexOf('base64,') > -1) {
      html += '<div class="firma"><div class="etq">Firma del cliente:</div><br/><img src="' + firmaUrl + '" style="max-width:420px;border:1px solid #333;"/></div>';
    }
    html += '</div></body></html>';

    // Convertir a PDF
    var pdfBlob = HtmlService.createHtmlOutput(html).getAs('application/pdf').setName('Ficha_' + safeName + '.pdf');
    var pdfFile = clienteFolder.createFile(pdfBlob);

    // Registrar en Google Sheet (crear si no existe)
    var sheet = null;
    if (SHEET_ID && SHEET_ID.length>3) {
      try {
        sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
      } catch (err) {
        sheet = null;
      }
    }
    if (!sheet) {
      var ss = null;
      var files = DriveApp.getFilesByName(MAIN_FOLDER_NAME + '_registros');
      if (files.hasNext()) {
        ss = SpreadsheetApp.open(files.next());
      } else {
        ss = SpreadsheetApp.create(MAIN_FOLDER_NAME + '_registros');
        var f = DriveApp.getFileById(ss.getId());
        mainFolder.addFile(f);
        DriveApp.getRootFolder().removeFile(f);
      }
      sheet = ss.getActiveSheet();
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(['Timestamp','Nombre','Apellidos','DNI','Email','Teléfono','Cuota','Carpeta_URL','datos.txt','firma.png','pdf']);
      }
    }

    // Enlaces
    var folderUrl = clienteFolder.getUrl();
    var datosUrl = datosFile.getUrl();
    var firmaUrlDrive = firmaFile ? firmaFile.getUrl() : '';
    var pdfUrl = pdfFile.getUrl();

    sheet.appendRow([new Date(), nombre, apellidos, dni, email, telefono, cuota, folderUrl, datosUrl, firmaUrlDrive, pdfUrl]);

    return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
  } catch (error) {
    return ContentService.createTextOutput('ERROR: ' + error.toString());
  }
}

/**
 * sanitizeFilename - quita caracteres problemáticos
 */
function sanitizeFilename(name) {
  return name.replace(/[\/\\#%&\{\}\<>\*\? $!@:|"^`'\[\];=+]/g, '_').substring(0, 200);
}

