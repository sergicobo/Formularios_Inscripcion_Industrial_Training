# Formularios de Inscripción - Industrial Training

Sistema completo de inscripción de clientes para Industrial Training con generación automática de PDFs y gestión avanzada de datos.

## 🏋️‍♂️ Descripción

Sistema web profesional diseñado para gestionar inscripciones de clientes en Industrial Training. Incluye formulario responsive, validaciones avanzadas, generación automática de documentos legales en PDF, y sistema de autorización específico para menores de edad.

## ✨ Características Principales

### 📝 Formulario de Inscripción Avanzado
- **Datos personales completos**: Nombre, apellidos, DNI con validación, fecha de nacimiento
- **Información de contacto**: Teléfono con formateo automático, email, dirección completa
- **Selección de cuotas**: 11 planes diferentes incluyendo opciones KIDS
- **Firma digital**: Canvas integrado para firma del cliente
- **Autorización de menores**: Sistema específico para cuotas KIDS con datos del tutor

### 🔍 Validaciones Inteligentes
- **DNI español**: Verificación con dígito de control y formato automático
- **Teléfono**: Validación para móviles y fijos españoles con formateo
- **IBAN**: Validación completa con algoritmo mod-97 y formato automático
- **Fecha de nacimiento**: Selector intuitivo con validación de fechas válidas
- **Campos dinámicos**: Validación condicional según tipo de cuota seleccionada

### 📱 Diseño Responsive
- **Optimizado para móviles**: Diseño específico para dispositivos táctiles
- **Google Apps Script compatible**: Funcionamiento perfecto en webviews
- **Canvas adaptativo**: Firma que se ajusta automáticamente al dispositivo
- **Viewport inteligente**: Control específico para diferentes resoluciones

### 🎨 Cuotas Disponibles
1. **Bon día** - 55€/mes × 3 wods semanales
2. **Bronce** - 55€/mes × 2 wods semanales  
3. **Plata** - 65€/mes × 3 wods semanales
4. **Oro** - 75€/mes × 4 wods semanales
5. **Diamante** - 85€/mes × clases ilimitadas
6. **Boxeo** - 65€/mes × clases ilimitadas
7. **BJJ** - 65€/mes × clases ilimitadas
8. **Fusión Boxeo** - 75€/mes × 2 wods + boxeo ilimitado
9. **Fusión BJJ** - 75€/mes × 2 wods + bjj ilimitado
10. **KIDS** - 45€/mes × 1 actividad
11. **KIDS DUO** - 65€/mes × 2 actividades

### 👶 Sistema KIDS (Menores de Edad)
- **Autorización automática**: Se activa al seleccionar cuotas KIDS
- **Datos del tutor**: Nombre completo y DNI con validación
- **PDF de 2 páginas**: 
  - Página 1: Ficha estándar del menor
  - Página 2: Autorización legal específica
- **Validación específica**: Campos obligatorios dinámicos
- **Firma duplicada**: Del tutor legal en ambas páginas

### 📄 Generación Automática de Documentos
- **PDF profesional**: Con diseño corporativo de Industrial Training
- **Datos completos**: Toda la información del formulario estructurada
- **Firma integrada**: Imagen de firma incluida en el documento
- **Textos legales**: RGPD, condiciones de pago, autorización SEPA
- **Logo corporativo**: Integración automática del logo empresarial

### 💾 Gestión de Datos
- **Google Drive**: Carpeta automática por cliente (Nombre_Apellidos_DNI)
- **Archivos generados**:
  - `datos.txt`: Información estructurada del cliente
  - `Ficha_[Cliente].pdf`: Documento legal completo
- **Google Sheets**: Registro automático con enlaces directos
- **Backup seguro**: Almacenamiento en la nube automático

### 🔐 Opciones de Pago
- **Domiciliación bancaria**: Días 5 o 28 del mes
- **Efectivo**: Hasta el día 5 de cada mes
- **IBAN obligatorio**: Para todas las modalidades
- **Autorización SEPA**: Cumplimiento normativa europea

### ⚖️ Cumplimiento Legal
- **RGPD**: Cumplimiento Reglamento Europeo de Protección de Datos
- **LOPDGDD**: Ley Orgánica española de protección de datos
- **Autorización menores**: Sistema legal para tutores
- **Derechos de imagen**: Autorización específica incluida
- **Condiciones comerciales**: Transparentes y detalladas

## 🛠️ Tecnologías Utilizadas

### Frontend
- **HTML5**: Estructura semántica moderna
- **CSS3**: Variables CSS, Grid, Flexbox, animaciones
- **JavaScript ES6+**: Funcionalidades avanzadas, validaciones
- **Canvas API**: Para funcionalidad de firma digital

### Backend
- **Google Apps Script**: Procesamiento serverless
- **Google Drive API**: Gestión automática de archivos
- **Google Sheets API**: Base de datos en la nube

### Integraciones
- **HTML to PDF**: Conversión automática con estilos
- **Base64 encoding**: Para imágenes y firmas
- **SEPA validation**: Validación IBAN europea

## 📋 Instalación y Configuración

### 1. Configuración de Google Apps Script
```javascript
// En Codigo.gs, configurar IDs:
const LOGO_FILE_ID = 'tu_logo_file_id';  // ID del logo en Drive
const SHEET_ID = 'tu_sheet_id';          // ID de hoja de cálculo (opcional)
```

### 2. Despliegue Web
1. Abrir Google Apps Script
2. Crear nuevo proyecto
3. Copiar contenido de `Codigo.gs`
4. Agregar archivo HTML con contenido de `formulario.html`
5. Desplegar como aplicación web:
   - **Ejecutar como**: Yo
   - **Acceso**: Cualquier persona, incluso anónimos

### 3. Configuración de Drive
- El sistema creará automáticamente la carpeta "Fichas Inscripción IT"
- Subir logo corporativo a Drive y obtener su ID
- Configurar permisos de la hoja de cálculo si se usa

## 📖 Uso del Sistema

### Para Clientes
1. Acceder a la URL de la aplicación web
2. Completar todos los campos obligatorios
3. Seleccionar cuota deseada
4. Si es KIDS: completar datos del tutor
5. Firmar en el canvas
6. Aceptar condiciones
7. Enviar formulario
8. Recibir confirmación automática

### Para Administradores
- **Google Drive**: Acceso a carpetas de clientes organizadas
- **Google Sheets**: Vista general de inscripciones con enlaces
- **PDFs generados**: Documentos legales listos para imprimir
- **Datos estructurados**: Información organizada en archivos de texto

## 🔧 Características Técnicas

### Validaciones Implementadas
- **DNI**: Algoritmo completo con letra de control
- **Teléfono**: Formatos móvil y fijo españoles
- **IBAN**: Validación mod-97 con soporte multinacional
- **Email**: Validación RFC estándar
- **Fechas**: Rangos válidos y formato correcto

### Responsive Design
- **Breakpoints**: 480px, 768px, 1024px, 1200px
- **Touch optimized**: Elementos táctiles de 44px mínimo
- **Canvas adaptativo**: Firma que se escala según dispositivo
- **Viewport control**: Específico para Google Apps Script

### Seguridad
- **Validación client-side**: Primera línea de defensa
- **Validación server-side**: En Google Apps Script
- **Sanitización**: Nombres de archivo seguros
- **Error handling**: Manejo robusto de errores

## 📊 Estructura de Archivos Generados

```
Fichas Inscripción IT/
├── Juan_Perez_12345678Z/
│   ├── datos.txt
│   └── Ficha_Juan_Perez_12345678Z.pdf
├── Maria_Garcia_87654321A/
│   ├── datos.txt
│   └── Ficha_Maria_Garcia_87654321A.pdf
└── Fichas Inscripción IT_registros (Google Sheets)
```

## 🎯 Ventajas del Sistema

### Para el Negocio
- ✅ **Automatización completa** del proceso de inscripción
- ✅ **Documentos legales** generados automáticamente
- ✅ **Cumplimiento normativo** RGPD y SEPA
- ✅ **Organización automática** de archivos de clientes
- ✅ **Backup en la nube** con Google Drive

### Para los Clientes
- ✅ **Proceso intuitivo** y fácil de completar
- ✅ **Validaciones en tiempo real** para evitar errores
- ✅ **Responsive design** para cualquier dispositivo
- ✅ **Confirmación inmediata** del procesamiento

### Para Menores (KIDS)
- ✅ **Sistema legal específico** para autorizaciones
- ✅ **Documentación completa** en PDF de 2 páginas
- ✅ **Validación de tutores** con DNI verificado
- ✅ **Consentimiento médico** incluido

## 🤝 Contribución

Para contribuir al proyecto:
1. Fork del repositorio
2. Crear rama para nueva funcionalidad
3. Implementar mejoras
4. Probar en Google Apps Script
5. Crear Pull Request

## 📄 Licencia

Este proyecto está bajo licencia MIT. Ver archivo LICENSE para más detalles.

## 📞 Soporte

Para soporte técnico o consultas sobre el sistema:
- **Issues**: GitHub Issues del proyecto
- **Documentación**: Archivo MEJORAS_KIDS.md para detalles técnicos
- **Testing**: Probar en entorno de Google Apps Script antes de desplegar
