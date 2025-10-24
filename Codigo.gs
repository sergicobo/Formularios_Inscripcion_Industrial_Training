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
 *            saves datos.txt and generates a PDF with the data and embedded logo.
 *  - logs entries into a Google Sheet (creates one if SHEET_ID left empty)
 *
 * Deploy as "Web app" (Execute as: Me; Access: Anyone, even anonymous) for public form usage.
 */

 // ⚙️ SUSTITUIR: coloca aquí el File ID de tu logo (opcional). Deja vacío '' si no quieres logo en PDF.
const LOGO_FILE_ID = '1wQ62DvlX4-DIwBkPj5Hg9-cpQvhPbcF7'; // ⚙️ Sustituir LOGO_FILE_ID aquí

// ⚙️ SUSTITUIR: coloca aquí el ID de la Google Sheet donde quieres registrar los envíos (opcional).
const SHEET_ID = ''; // ⚙️ Sustituir SHEET_ID aquí

const MAIN_FOLDER_NAME = 'Fichas Inscripción IT' ;

/**
 * doGet - sirve el formulario HTML incluido en el proyecto (archivo 'Formulario')
 */
function doGet(e) {
  const template = HtmlService.createTemplateFromFile('formulario');
  template.scriptURL = ScriptApp.getService().getUrl(); // ✅ Inyecta la URL
  return template.evaluate()
    .setTitle('Ficha Inscripción - Industrial Training')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
}


/**
 * doPost - procesa envíos:
 *  - crea carpeta principal si no existe
 *  - crea carpeta por cliente (Nombre_Apellidos_DNI)
 *  - guarda datos.txt y genera PDF con datos+firma+logo
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

    // Obtener firma para el PDF y validar que esté presente
    var firmaUrl = params.firma || '';
    
    // Validar que la firma esté presente y tenga contenido
    if (!firmaUrl || firmaUrl.indexOf('base64,') === -1) {
      return ContentService.createTextOutput('ERROR: La firma es obligatoria. Por favor, firme en el recuadro antes de enviar el formulario.')
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

    // Función para formatear fecha de ISO (YYYY-MM-DD) a DD/MM/YYYY
    function formatDateToDDMMYYYY(isoDate) {
      if (!isoDate) return '';
      try {
        var parts = isoDate.split('-');
        if (parts.length === 3) {
          return parts[2] + '/' + parts[1] + '/' + parts[0];
        }
        return isoDate; // Si no es formato ISO, devolver como está
      } catch (err) {
        return isoDate; // En caso de error, devolver como está
      }
    }

    // Formatear fecha de nacimiento para mostrar
    var fechaNacimientoFormateada = formatDateToDDMMYYYY(fecha_nacimiento);

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

    // Crear datos.txt con fecha formateada
    var contenido =
      'Nombre: ' + nombre + '\n' +
      'Apellidos: ' + apellidos + '\n' +
      'DNI: ' + dni + '\n' +
      'Fecha de Nacimiento: ' + fechaNacimientoFormateada + '\n' +
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
      logToSheet(params, clienteFolder, datosFile, pdfFile, mainFolder);
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
 * Optimizado para una sola página con textos máximos y separación óptima
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

  // Función para formatear fecha de ISO (YYYY-MM-DD) a DD/MM/YYYY
  function formatDateToDDMMYYYY(isoDate) {
    if (!isoDate) return '';
    try {
      var parts = isoDate.split('-');
      if (parts.length === 3) {
        return parts[2] + '/' + parts[1] + '/' + parts[0];
      }
      return isoDate; // Si no es formato ISO, devolver como está
    } catch (err) {
      return isoDate; // En caso de error, devolver como está
    }
  }

  var html = `<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Ficha de Inscripción - Industrial Training</title>
    <style>
        @page {
            size: A4;
            margin: 9mm 7mm 9mm 7mm;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 0;
            background: #E1AA00;
            color: #000000;
            line-height: 1.2;
            font-size: 14px;
        }
        
        .container {
            width: 100%;
            background: #E1AA00;
            border-radius: 6px;
            overflow: hidden;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #000000;
            color: #E1AA00;
            padding: 10px 14px;
            border-bottom: 2px solid #f3ae00;
            margin-bottom: 10px;
        }
        
        .logo {
            max-width: 120px;
            max-height: 40px;
        }
        
        .header-title {
            font-size: 21px;
            font-weight: bold;
            margin: 0;
        }
        
        .content {
            padding: 0 6px;
        }
        
        .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-bottom: 10px;
            width: 100%;
        }
        
        .full-width {
            grid-column: 1 / -1;
        }
        
        .field {
            background: #ffffff;
            padding: 8px;
            border-radius: 3px;
            border: 1px solid #d1d5db;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            page-break-inside: avoid;
            min-height: 28px;
            display: flex;
            flex-direction: column;
        }
        
        .field-label {
            font-weight: bold;
            color: #333333;
            font-size: 12px;
            margin-bottom: 5px;
            text-transform: uppercase;
            letter-spacing: 0.2px;
            line-height: 1.1;
        }
        
        .field-value {
            color: #000000;
            font-size: 13px;
            line-height: 1.2;
            word-wrap: break-word;
            word-break: break-word;
            hyphens: auto;
            flex-grow: 1;
            display: flex;
            align-items: center;
        }
        
        .field-value.long-text {
            font-size: 12px;
            line-height: 1.1;
        }
        
        .signature-section {
            background: #ffffff;
            padding: 10px;
            border-radius: 3px;
            border: 1px solid #d1d5db;
            text-align: center;
            margin: 8px 0;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            page-break-inside: avoid;
        }
        
        .signature-image {
            max-width: 200px;
            max-height: 55px;
            border: 1px solid #333;
            border-radius: 2px;
            margin-top: 6px;
        }
        
        .legal-text {
            background: rgba(255,255,255,0.95);
            padding: 5px 7px;
            border-radius: 3px;
            font-size: 8px;
            color: #333333;
            margin-top: 5px;
            line-height: 1.1;
            text-align: justify;
            grid-column: 1 / -1;
        }
        
        .final-legal {
            background: rgba(255,255,255,0.95);
            padding: 7px;
            border-radius: 3px;
            font-size: 8px;
            color: #333333;
            margin-top: 8px;
            line-height: 1.1;
            text-align: justify;
            page-break-inside: avoid;
        }
        
        /* Especial para campos largos */
        .field.iban .field-value,
        .field.cuota .field-value,
        .field.direccion .field-value {
            font-size: 12px;
            line-height: 1.1;
        }
        
        /* Evitar saltos de página problemáticos */
        .grid,
        .signature-section,
        .final-legal {
            page-break-inside: avoid;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo-container">`;
  
  if (logoDataUrl) {
    html += `<img src="${logoDataUrl}" alt="Industrial Training" class="logo">`;
  }
  
  html += `
            </div>
            <div class="header-title">Ficha de Inscripción</div>
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

  // Función auxiliar para agregar texto legal
  function addLegalText(text) {
    html += `
                <div class="legal-text">${text}</div>`;
  }

  // Agregar todos los campos con optimizaciones específicas
  addField('Nombre', params.nombre || '');
  addField('Apellidos', params.apellidos || '');
  addField('DNI', params.dni || '', true);
  
  // Formatear fecha de nacimiento
  var fechaNacimientoFormateada = formatDateToDDMMYYYY(params.fecha_nacimiento || '');
  addField('Fecha de Nacimiento', fechaNacimientoFormateada);
  
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
  
  // Opción de pago con texto legal debajo
  addField('Opción de Pago', params.pago || '', true, true);
  addLegalText('<strong>Condiciones de Pago:</strong> En caso de devolución del recibo, se cobrarán 8 € por costes bancarios. Si no se realiza el pago antes del día 5, el recibo se girará automáticamente. Si la deuda no se paga antes del día 8, la membresía se dará de baja y deberá reiniciarse la inscripción con los pagos correspondientes. La solicitud de baja deberá realizarse antes del día 25 de cada mes.');
  
  // IBAN con texto legal debajo
  addField('IBAN', params.iban || '', true, true);
  addLegalText('<strong>Autorización SEPA:</strong> El cliente autoriza a Industrial Training a gestionar los pagos de sus cuotas mediante domiciliación bancaria conforme a la normativa SEPA (Reglamento UE 260/2012). Declara que los datos bancarios proporcionados son veraces y autoriza su uso exclusivo para este fin.');
  
  addField('Condiciones', conditionsValue, true);
  addField('Fecha de Inscripción', params.fecha_actual || '', true);

  html += `
            </div>`;

  // Sección de firma más compacta
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
                <div style="height: 44px; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; color: #666; font-style: italic; font-size: 12px;">
                    Firma no proporcionada
                </div>
            </div>`;
  }

  // Protección de datos al final
  html += `
            <div class="final-legal">
                <strong>Protección de Datos:</strong> De acuerdo con el Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD), se informa que el responsable del tratamiento de la información es Industrial Training, con la finalidad de gestionar inscripciones, cobros y actividades del gimnasio.
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
function logToSheet(params, clienteFolder, datosFile, pdfFile, mainFolder) {
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
      sheet.appendRow(['Timestamp','Nombre','Apellidos','DNI','Email','Teléfono','Cuota','Carpeta_URL','datos.txt','pdf']);
    }
  }

  // Agregar fila con los datos
  try {
    var folderUrl = clienteFolder.getUrl();
    var datosUrl = datosFile ? datosFile.getUrl() : '';
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

