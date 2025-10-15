/**
 * Code.gs - Apps Script for Industrial Training Form
 *
 * ⚠️ IMPORTANT: Replace the placeholders below with your actual IDs when ready:
 *   - LOGO_FILE_ID: the Drive file ID of your horizontal logo (optional)
 *   - SHEET_ID: (optional) the ID of the Google Sheet to log submissions
 *
 * The script supports:
 *  - doGet: serves the Formulario.html inside Apps Script (so one URL hosts the form)
 *  - doPost: receives form submissions, creates a folder per client inside "Fichas Inscripción IT",
 *            saves datos.txt, firma.png and generates a PDF with the data and embedded logo.
 *  - logs entries into a Google Sheet (creates one if SHEET_ID left empty)
 *
 * Deploy as "Web app" (Execute as: Me; Access: Anyone, even anonymous) for public form usage.
 */

// ⚙️ SUSTITUIR: coloca aquí el File ID de tu logo (opcional). Deja vacío '' si no quieres logo en PDF.
const LOGO_FILE_ID = '1wQ62DvlX4-DIwBkPj5Hg9-cpQvhPbcF7'; // ⚙️ Sustituir LOGO_FILE_ID aquí

// ⚙️ SUSTITUIR: coloca aquí el ID de la Google Sheet donde quieres registrar los envíos (opcional).
const SHEET_ID = ''; // ⚙️ Sustituir SHEET_ID aquí

const MAIN_FOLDER_NAME = 'Fichas Inscripción IT';

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

    // Validación básica de campos requeridos
    if (!params.nombre || !params.apellidos || !params.dni || !params.email) {
      return ContentService.createTextOutput('ERROR: Faltan campos obligatorios (nombre, apellidos, DNI, email)')
        .setMimeType(ContentService.MimeType.TEXT);
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
    var conditions = params.conditions === 'Condiciones' ? 'Aceptado' : (params.conditions || '');
    var fecha_actual = params.fecha_actual || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");

    // Carpeta principal
    var mainFolder;
    try {
      mainFolder = DriveApp.getFoldersByName(MAIN_FOLDER_NAME).hasNext()
                   ? DriveApp.getFoldersByName(MAIN_FOLDER_NAME).next()
                   : DriveApp.createFolder(MAIN_FOLDER_NAME);
    } catch (error) {
      return ContentService.createTextOutput('ERROR: No se pudo crear/acceder a la carpeta principal: ' + error.toString())
        .setMimeType(ContentService.MimeType.TEXT);
    }

    // Carpeta cliente
    var safeName = sanitizeFilename(((nombre+'_'+apellidos+'_'+dni).trim()) || ('cliente_' + new Date().getTime()));
    var clienteFolder;
    try {
      clienteFolder = mainFolder.createFolder(safeName);
    } catch (error) {
      return ContentService.createTextOutput('ERROR: No se pudo crear la carpeta del cliente: ' + error.toString())
        .setMimeType(ContentService.MimeType.TEXT);
    }

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
      'Condiciones aceptadas: ' + conditions + '\n' +
      'Fecha (envío): ' + fecha_actual + '\n';
    
    var datosFile;
    try {
      datosFile = clienteFolder.createFile('datos.txt', contenido, MimeType.PLAIN_TEXT);
    } catch (error) {
      return ContentService.createTextOutput('ERROR: No se pudo crear el archivo de datos: ' + error.toString())
        .setMimeType(ContentService.MimeType.TEXT);
    }

    // Guardar firma (dataURL base64)
    var firmaUrl = params.firma || '';
    var firmaFile = null;
    if (firmaUrl && firmaUrl.indexOf('base64,') > -1) {
      try {
        var b64 = firmaUrl.split('base64,')[1];
        var blob = Utilities.newBlob(Utilities.base64Decode(b64), 'image/png', 'firma.png');
        firmaFile = clienteFolder.createFile(blob);
      } catch (error) {
        Logger.log('Warning: No se pudo guardar la firma: ' + error.toString());
      }
    }

    // Guardar formulario.html completo (recibido del frontend)
    var htmlForm = params.formulario_html || '';
    if (htmlForm) {
      try {
        clienteFolder.createFile('formulario_completo.html', htmlForm, MimeType.HTML);
      } catch (error) {
        Logger.log('Warning: No se pudo guardar el formulario HTML: ' + error.toString());
      }
    }

    // Generar HTML mejorado para PDF con el estilo de Industrial Training
    var html = generateStyledFormHTML(params, firmaUrl);

    // Convertir a PDF
    var pdfFile;
    try {
      var pdfBlob = HtmlService.createHtmlOutput(html).getAs('application/pdf').setName('Ficha_' + safeName + '.pdf');
      pdfFile = clienteFolder.createFile(pdfBlob);
    } catch (error) {
      return ContentService.createTextOutput('ERROR: No se pudo generar el PDF: ' + error.toString())
        .setMimeType(ContentService.MimeType.TEXT);
    }

    // Registrar en Google Sheet
    try {
      logToSheet(params, clienteFolder, datosFile, firmaFile, pdfFile, mainFolder);
    } catch (error) {
      Logger.log('Warning: No se pudo registrar en la hoja de cálculo: ' + error.toString());
    }

    return ContentService.createTextOutput('OK - Inscripción procesada correctamente')
      .setMimeType(ContentService.MimeType.TEXT);
      
  } catch (error) {
    Logger.log('Error general en doPost: ' + error.toString());
    return ContentService.createTextOutput('ERROR: Error interno del servidor - ' + error.toString())
      .setMimeType(ContentService.MimeType.TEXT);
  }
}

/**
 * Genera HTML estilizado para el PDF con el diseño de Industrial Training
 * Optimizado para evitar cortes de texto y adaptarse al tamaño del PDF
 */
function generateStyledFormHTML(params, firmaUrl) {
  var logoDataUrl = '';
  
  // Intentar obtener el logo
  if (LOGO_FILE_ID && LOGO_FILE_ID.length > 3) {
    try {
      var logoFile = DriveApp.getFileById(LOGO_FILE_ID);
      var logoBlob = logoFile.getBlob();
      logoDataUrl = 'data:' + logoBlob.getContentType() + ';base64,' + Utilities.base64Encode(logoBlob.getBytes());
    } catch (err) {
      Logger.log('Warning: No se pudo cargar el logo: ' + err.toString());
    }
  }

  // Procesar el valor de condiciones
  var conditionsValue = params.conditions === 'Condiciones' ? 'Aceptado' : (params.conditions || '');

  var html = `<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Ficha de Inscripción - Industrial Training</title>
    <style>
        @page {
            size: A4;
            margin: 15mm 10mm 15mm 10mm;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 0;
            background: #E1AA00;
            color: #000000;
            line-height: 1.3;
            font-size: 11px;
        }
        
        .container {
            width: 100%;
            background: #E1AA00;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .header {
            background: #000000;
            color: #E1AA00;
            text-align: center;
            padding: 12px;
            border-bottom: 3px solid #f3ae00;
            margin-bottom: 12px;
        }
        
        .logo {
            max-width: 150px;
            max-height: 60px;
            margin-bottom: 8px;
        }
        
        .header h1 {
            margin: 8px 0 4px 0;
            font-size: 18px;
            font-weight: bold;
        }
        
        .header .subtitle {
            margin: 0;
            font-size: 12px;
            opacity: 0.9;
        }
        
        .content {
            padding: 0 8px;
        }
        
        .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-bottom: 12px;
            width: 100%;
        }
        
        .full-width {
            grid-column: 1 / -1;
        }
        
        .field {
            background: #ffffff;
            padding: 8px;
            border-radius: 4px;
            border: 1px solid #d1d5db;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            page-break-inside: avoid;
            min-height: 32px;
            display: flex;
            flex-direction: column;
        }
        
        .field-label {
            font-weight: bold;
            color: #333333;
            font-size: 9px;
            margin-bottom: 3px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            line-height: 1.2;
        }
        
        .field-value {
            color: #000000;
            font-size: 10px;
            line-height: 1.3;
            word-wrap: break-word;
            word-break: break-word;
            hyphens: auto;
            flex-grow: 1;
            display: flex;
            align-items: center;
        }
        
        .field-value.long-text {
            font-size: 9px;
            line-height: 1.2;
        }
        
        .signature-section {
            background: #ffffff;
            padding: 12px;
            border-radius: 4px;
            border: 1px solid #d1d5db;
            text-align: center;
            margin: 8px 0;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            page-break-inside: avoid;
        }
        
        .signature-image {
            max-width: 300px;
            max-height: 100px;
            border: 1px solid #333;
            border-radius: 2px;
            margin-top: 6px;
        }
        
        .legal-section {
            background: rgba(255,255,255,0.95);
            padding: 8px;
            border-radius: 4px;
            font-size: 8px;
            color: #333333;
            margin-top: 8px;
            line-height: 1.2;
            page-break-inside: avoid;
        }
        
        .legal-section h4 {
            margin: 0 0 4px 0;
            font-size: 9px;
            color: #000000;
        }
        
        .legal-section p {
            margin: 4px 0;
            text-align: justify;
        }
        
        .footer {
            text-align: center;
            margin-top: 12px;
            font-size: 8px;
            color: #555;
        }
        
        /* Especial para campos largos */
        .field.iban .field-value,
        .field.cuota .field-value,
        .field.direccion .field-value {
            font-size: 9px;
            line-height: 1.2;
        }
        
        /* Evitar saltos de página problemáticos */
        .grid,
        .signature-section,
        .legal-section {
            page-break-inside: avoid;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">`;
  
  if (logoDataUrl) {
    html += `<img src="${logoDataUrl}" alt="Industrial Training" class="logo">`;
  }
  
  html += `
            <h1>Ficha de Inscripción</h1>
            <div class="subtitle">Industrial Training</div>
        </div>
        <div class="content">
            <div class="grid">`;

  // Función auxiliar para agregar campos con detección de contenido largo
  function addField(label, value, fullWidth = false, isLongContent = false) {
    const widthClass = fullWidth ? ' full-width' : '';
    const specialClass = isLongContent ? ' long-text' : '';
    const fieldClass = label.toLowerCase().includes('iban') ? ' iban' : 
                       label.toLowerCase().includes('cuota') ? ' cuota' : 
                       label.toLowerCase().includes('direc') ? ' direccion' : '';
    
    html += `
                <div class="field${widthClass}${fieldClass}">
                    <div class="field-label">${label}</div>
                    <div class="field-value${specialClass}">${(value || '-').toString().replace(/\n/g, '<br>')}</div>
                </div>`;
  }

  // Agregar todos los campos con optimizaciones específicas
  addField('Nombre', params.nombre || '');
  addField('Apellidos', params.apellidos || '');
  addField('DNI', params.dni || '', true);
  addField('Fecha de Nacimiento', params.fecha_nacimiento || '');
  addField('Teléfono', params.telefono || '');
  
  // Dirección con manejo especial
  var direccionCompleta = (params.direccion || '') + (params.direccion2 ? (' / ' + params.direccion2) : '');
  addField('Dirección', direccionCompleta, true, direccionCompleta.length > 50);
  
  addField('Ciudad', params.ciudad || '');
  addField('Estado/Provincia', params.estado || '');
  addField('Código Postal', params.cp || '');
  addField('Email', params.email || '');
  
  // Cuota con manejo especial para texto largo
  addField('Cuota Seleccionada', params.cuota || '', true, true);
  addField('Derechos de Imagen', params.imagen || '', true, true);
  addField('Opción de Pago', params.pago || '', true, true);
  
  // IBAN con manejo especial
  addField('IBAN', params.iban || '', true, true);
  addField('Condiciones', conditionsValue, true);
  addField('Fecha de Inscripción', params.fecha_actual || '', true);

  html += `
            </div>`;

  // Sección de firma
  if (firmaUrl && firmaUrl.indexOf('base64,') > -1) {
    html += `
            <div class="signature-section">
                <div class="field-label">Firma del Cliente</div>
                <img src="${firmaUrl}" alt="Firma del cliente" class="signature-image">
            </div>`;
  } else {
    html += `
            <div class="signature-section">
                <div class="field-label">Firma del Cliente</div>
                <div style="height: 60px; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; color: #666; font-style: italic; font-size: 9px;">
                    Firma no proporcionada
                </div>
            </div>`;
  }

  // Sección legal optimizada
  html += `
            <div class="legal-section">
                <h4>Información Legal y Condiciones:</h4>
                <p><strong>Condiciones de Pago:</strong> En caso de devolución del recibo, se cobrarán 8 € por costes bancarios. Si no se realiza el pago antes del día 5, el recibo se girará automáticamente. Si la deuda no se paga antes del día 8, la membresía se dará de baja y deberá reiniciarse la inscripción con los pagos correspondientes. La solicitud de baja deberá realizarse antes del día 25 de cada mes.</p>
                
                <p><strong>Autorización SEPA:</strong> El cliente autoriza a Industrial Training a gestionar los pagos de sus cuotas mediante domiciliación bancaria conforme a la normativa SEPA (Reglamento UE 260/2012). Declara que los datos bancarios proporcionados son veraces y autoriza su uso exclusivo para este fin.</p>
                
                <p><strong>Protección de Datos:</strong> De acuerdo con el Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD), se informa que el responsable del tratamiento de la información es Industrial Training, con la finalidad de gestionar inscripciones, cobros y actividades del gimnasio.</p>
            </div>
            
            <div class="footer">
                Documento generado el ${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy 'a las' HH:mm:ss")}
            </div>
        </div>
    </div>
</body>
</html>`;

  return html;
}

/**
 * Registra la inscripción en Google Sheet
 */
function logToSheet(params, clienteFolder, datosFile, firmaFile, pdfFile, mainFolder) {
  var sheet = null;
  
  // Intentar abrir sheet existente
  if (SHEET_ID && SHEET_ID.length > 3) {
    try {
      sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
    } catch (err) {
      Logger.log('No se pudo abrir la sheet especificada: ' + err.toString());
    }
  }
  
  // Si no hay sheet, crear una nueva
  if (!sheet) {
    var ss = null;
    var files = DriveApp.getFilesByName(MAIN_FOLDER_NAME + '_registros');
    if (files.hasNext()) {
      try {
        ss = SpreadsheetApp.open(files.next());
      } catch (err) {
        Logger.log('Error abriendo sheet existente: ' + err.toString());
      }
    }
    
    if (!ss) {
      try {
        ss = SpreadsheetApp.create(MAIN_FOLDER_NAME + '_registros');
        var f = DriveApp.getFileById(ss.getId());
        mainFolder.addFile(f);
        DriveApp.getRootFolder().removeFile(f);
      } catch (err) {
        Logger.log('Error creando nueva sheet: ' + err.toString());
        return;
      }
    }
    
    sheet = ss.getActiveSheet();
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Timestamp','Nombre','Apellidos','DNI','Email','Teléfono','Cuota','Carpeta_URL','datos.txt','firma.png','pdf']);
    }
  }

  // Agregar fila con los datos
  try {
    var folderUrl = clienteFolder.getUrl();
    var datosUrl = datosFile ? datosFile.getUrl() : '';
    var firmaUrlDrive = firmaFile ? firmaFile.getUrl() : '';
    var pdfUrl = pdfFile ? pdfFile.getUrl() : '';

    // Procesar el valor de condiciones para el sheet también
    var conditionsValue = params.conditions === 'Condiciones' ? 'Aceptado' : (params.conditions || '');

    sheet.appendRow([
      new Date(), 
      params.nombre || '', 
      params.apellidos || '', 
      params.dni || '', 
      params.email || '', 
      params.telefono || '', 
      params.cuota || '', 
      folderUrl, 
      datosUrl, 
      firmaUrlDrive, 
      pdfUrl
    ]);
  } catch (err) {
    Logger.log('Error agregando fila a la sheet: ' + err.toString());
  }
}

/**
 * sanitizeFilename - quita caracteres problemáticos
 */
function sanitizeFilename(name) {
  return name.replace(/[\/\\#%&\{\}\<>\*\? $!@:|"^`'\[\];=+]/g, '_').substring(0, 200);
}

