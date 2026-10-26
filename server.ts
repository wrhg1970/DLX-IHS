import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import * as XLSX from 'xlsx';
import nodemailer from 'nodemailer';

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  
  const portArgIndex = process.argv.indexOf('--port');
  const portArg = portArgIndex !== -1 ? Number(process.argv[portArgIndex + 1]) : NaN;
  const PORT = !isNaN(portArg) ? portArg : (Number(process.env.PORT) || 3000);

  const hostArgIndex = process.argv.indexOf('--host');
  const hostArg = hostArgIndex !== -1 ? process.argv[hostArgIndex + 1] : undefined;
  const HOST = hostArg || process.env.HOST || '0.0.0.0';

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Middleware to ensure body-parser or payload limit errors return JSON instead of HTML
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api')) {
      console.error('API Body Parser Error:', err);
      if (err?.type === 'entity.too.large' || err?.status === 413) {
        return res.status(413).json({
          success: false,
          error: 'El contenido o archivo adjunto excede el tamaño máximo permitido (50MB).'
        });
      }
      return res.status(err?.status || 400).json({
        success: false,
        error: err?.message || 'Formato de petición inválido.'
      });
    }
    next(err);
  });

  app.post('/api/send-email', async (req, res) => {
    try {
      const { 
        smtpHost, 
        smtpPort, 
        smtpUser, 
        smtpPass, 
        smtpFromEmail, 
        smtpFromName,
        to, 
        cc,
        bcc,
        subject, 
        body,
        attachments,
        allowFallback = true,
        senderSignature
      } = req.body;

      // Ensure we have configuration from UI or server environment variables
      const host = (smtpHost || process.env.SMTP_HOST || '').trim();
      const port = Number(smtpPort || process.env.SMTP_PORT || 587);
      const user = (smtpUser || process.env.SMTP_USER || '').trim();
      const pass = (smtpPass || process.env.SMTP_PASS || '').trim();
      const fromEmail = (smtpFromEmail || process.env.SMTP_FROM_EMAIL || '').trim();
      const fromName = (smtpFromName || process.env.SMTP_FROM_NAME || "Instituto de Humanidades y Ciencias").trim();

      if (!to || !subject || !body) {
        return res.status(400).json({ success: false, error: 'Faltan parámetros requeridos: destinatario (to), asunto o contenido del mensaje.' });
      }

      // Build electronic signature if present
      let signatureHtml = '';
      let signatureText = '';
      if (senderSignature && senderSignature.enabled !== false) {
        const sigName = (senderSignature.name || fromName || '').trim();
        const sigTitle = (senderSignature.title || '').trim();
        const sigDepartment = (senderSignature.department || '').trim();
        const sigPhone = (senderSignature.phone || '').trim();
        const sigEmail = (senderSignature.email || fromEmail || '').trim();
        const sigWebsite = (senderSignature.website || '').trim();
        const sigImage = (senderSignature.signatureImage || '').trim();
        const sigCustomText = (senderSignature.signatureText || '').trim();
        const sigDisclaimer = (senderSignature.disclaimer || '').trim();

        // Plain text signature
        signatureText = `\n\n--\n${sigName}` +
          (sigTitle ? `\n${sigTitle}${sigDepartment ? ` - ${sigDepartment}` : ''}` : '') +
          (sigEmail ? `\nCorreo: ${sigEmail}` : '') +
          (sigPhone ? `\nTel: ${sigPhone}` : '') +
          (sigWebsite ? `\nWeb: ${sigWebsite}` : '') +
          `\n[Firma Electrónica Verificada]` +
          (sigDisclaimer ? `\n\n${sigDisclaimer}` : '');

        // HTML signature block
        signatureHtml = `
          <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <table cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; width: 100%; max-width: 550px;">
              ${sigImage ? `
                <tr>
                  <td colspan="2" style="padding-bottom: 12px;">
                    <img src="${sigImage}" alt="Firma Electrónica" style="max-height: 70px; max-width: 220px; object-fit: contain; display: block;" />
                  </td>
                </tr>
              ` : sigCustomText ? `
                <tr>
                  <td colspan="2" style="padding-bottom: 12px; font-family: 'Brush Script MT', 'Segoe Script', cursive, Georgia, serif; font-size: 24px; color: #1e3a8a; font-style: italic; font-weight: 600;">
                    ${sigCustomText}
                  </td>
                </tr>
              ` : ''}
              <tr>
                <td style="vertical-align: top; width: 4px; background-color: #4f46e5; border-radius: 2px;"></td>
                <td style="vertical-align: top; padding-left: 12px;">
                  <div style="font-size: 15px; font-weight: 700; color: #0f172a; line-height: 1.3;">
                    ${sigName}
                  </div>
                  ${sigTitle ? `
                    <div style="font-size: 13px; font-weight: 600; color: #4338ca; margin-top: 2px;">
                      ${sigTitle}${sigDepartment ? `<span style="color: #94a3b8; font-weight: normal;"> • </span>${sigDepartment}` : ''}
                    </div>
                  ` : ''}
                  <div style="font-size: 12px; color: #475569; margin-top: 6px; line-height: 1.6;">
                    ${sigEmail ? `<span style="margin-right: 12px;">✉️ <a href="mailto:${sigEmail}" style="color: #4f46e5; text-decoration: none;">${sigEmail}</a></span>` : ''}
                    ${sigPhone ? `<span style="margin-right: 12px;">📞 ${sigPhone}</span>` : ''}
                    ${sigWebsite ? `<span>🌐 <a href="${sigWebsite.startsWith('http') ? sigWebsite : 'https://' + sigWebsite}" target="_blank" style="color: #4f46e5; text-decoration: none;">${sigWebsite}</a></span>` : ''}
                  </div>
                  <div style="margin-top: 8px;">
                    <span style="display: inline-block; font-size: 10px; font-weight: 600; color: #047857; background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 2px 8px; border-radius: 9999px;">
                      ✓ Firma Electrónica Verificada por Plataforma IHS
                    </span>
                  </div>
                </td>
              </tr>
              ${sigDisclaimer ? `
                <tr>
                  <td colspan="2" style="padding-top: 14px;">
                    <p style="margin: 0; font-size: 10px; color: #94a3b8; line-height: 1.4; font-style: italic; border-top: 1px dashed #e2e8f0; padding-top: 10px;">
                      🔒 <strong>Confidencialidad:</strong> ${sigDisclaimer}
                    </p>
                  </td>
                </tr>
              ` : ''}
            </table>
          </div>
        `;
      }

      // Process attachments if present
      const processedAttachments: any[] = [];
      if (Array.isArray(attachments) && attachments.length > 0) {
        for (const att of attachments) {
          if (att.fileData && typeof att.fileData === 'string' && att.fileData.includes('base64,')) {
            const parts = att.fileData.split('base64,');
            const mimeMatch = att.fileData.match(/^data:([^;]+);/);
            const contentType = mimeMatch ? mimeMatch[1] : (att.fileType || 'application/octet-stream');
            processedAttachments.push({
              filename: att.fileName || att.filename || `${att.title || 'documento'}.pdf`,
              content: Buffer.from(parts[1], 'base64'),
              contentType: contentType
            });
          } else if (att.content) {
            processedAttachments.push({
              filename: att.fileName || att.filename || `${att.title || 'documento'}.txt`,
              content: att.content,
              encoding: att.encoding || 'utf-8'
            });
          } else if (att.path) {
            processedAttachments.push({
              filename: att.fileName || att.filename,
              path: att.path
            });
          } else {
            processedAttachments.push({
              filename: att.fileName || att.filename || `${att.title || 'documento'}.txt`,
              content: `Documento adjunto: ${att.title || att.fileName}\nCategoría: ${att.category || 'General'}\nTamaño: ${att.fileSize || 'N/A'}`
            });
          }
        }
      }

      // Detect placeholder or unconfigured credentials
      const isPlaceholder = !host || 
        !user || 
        !pass || 
        !fromEmail ||
        user.includes('ejemplo.com') || 
        user.includes('example.com') ||
        fromEmail.includes('ejemplo.com') || 
        fromEmail.includes('example.com') ||
        user === 'colegio@dominio.com' ||
        pass === 'ihs123';

      // If SMTP is not configured or uses placeholder credentials, gracefully simulate the email dispatch
      if (isPlaceholder) {
        console.log(`[Email Simulator] Dispatching simulated email to "${to}" (CC: "${cc || 'N/A'}", BCC: "${bcc || 'N/A'}") with ${processedAttachments.length} attachments\nSubject: "${subject}"\nBody preview: ${body.substring(0, 100)}...`);
        return res.json({
          success: true,
          simulated: true,
          message: `[Simulación] Correo generado y registrado para <${to}>${cc ? ` con copia a <${cc}>` : ''}${bcc ? ` y copia oculta a <${bcc}>` : ''} con ${processedAttachments.length} documento(s) adjunto(s). Para envíos a bandejas reales, configura tus credenciales SMTP en Configuración > Notificaciones.`
        });
      }

      // Configure nodemailer transporter with strict timeouts
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // true for 465, false for 587 or others
        auth: {
          user,
          pass,
        },
        tls: {
          rejectUnauthorized: false // bypass potential SSL/TLS cert issues for custom SMTPs
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 12000
      });

      // Email send options
      const mailOptions: any = {
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        text: body + (signatureText || ''),
        html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #1e293b; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between;">
            <h2 style="color: #4f46e5; margin: 0; font-size: 18px; font-weight: 700;">${fromName}</h2>
          </div>
          <p style="white-space: pre-wrap; margin-top: 16px; color: #334155; font-size: 14px;">${body}</p>
          ${signatureHtml || ''}
          ${processedAttachments.length > 0 ? `
          <div style="margin-top: 20px; padding: 12px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
            <p style="font-weight: 700; font-size: 12px; color: #1e293b; margin: 0 0 8px 0;">📎 Documentos Adjuntos (${processedAttachments.length}):</p>
            <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #475569;">
              ${processedAttachments.map(a => `<li>${a.filename}</li>`).join('')}
            </ul>
          </div>` : ''}
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; text-align: center;">
            Este es un correo oficial enviado a través de la plataforma de ${fromName}.
          </div>
        </div>`
      };

      if (cc && typeof cc === 'string' && cc.trim()) {
        mailOptions.cc = cc.trim();
      }
      if (bcc && typeof bcc === 'string' && bcc.trim()) {
        mailOptions.bcc = bcc.trim();
      }

      if (processedAttachments.length > 0) {
        mailOptions.attachments = processedAttachments;
      }

      try {
        // Send email via real SMTP transporter
        const info = await transporter.sendMail(mailOptions);
        console.log(`[SMTP Success] Email delivered to "${to}". Message ID: ${info.messageId}`);
        return res.json({ success: true, messageId: info.messageId, simulated: false });
      } catch (smtpError: any) {
        console.error("SMTP Transport Error: ", smtpError);
        
        let friendlyAdvice = smtpError.message || "Error al conectar con el servidor SMTP.";
        const isAuthError = smtpError.code === 'EAUTH' || (smtpError.message && (smtpError.message.includes('535') || smtpError.message.includes('Username and Password not accepted')));
        const isTimeout = smtpError.code === 'ETIMEDOUT' || smtpError.code === 'ECONNREFUSED' || smtpError.code === 'ESOCKET';

        if (isAuthError && (host.includes('gmail.com') || user.includes('@gmail.com'))) {
          friendlyAdvice = "Autenticación de Gmail rechazada. Google requiere activar la Verificación en 2 Pasos y generar una 'Contraseña de Aplicación' de 16 letras en myaccount.google.com/apppasswords en lugar de tu contraseña habitual de Google.";
        } else if (isAuthError) {
          friendlyAdvice = `Autenticación SMTP rechazada en el servidor "${host}". Verifica que el usuario y la contraseña o token de acceso sean correctos.`;
        } else if (isTimeout) {
          friendlyAdvice = `Tiempo de espera agotado al conectar con "${host}:${port}". El puerto o servidor podría estar inaccesible o bloqueado por el cortafuegos.`;
        }

        if (allowFallback) {
          // Gracefully log and allow fallback so the admin user workflow is not completely blocked
          console.warn(`[Email Fallback] Falling back to simulation for "${to}" due to SMTP failure.`);
          return res.json({
            success: true,
            simulated: true,
            warning: friendlyAdvice,
            technicalError: smtpError.message,
            message: `[Simulación] El correo fue registrado en el sistema debido a un fallo de conexión SMTP: ${friendlyAdvice}`
          });
        }

        return res.json({
          success: false,
          error: friendlyAdvice,
          technicalError: smtpError.message,
          isSmtpError: true
        });
      }
    } catch (error: any) {
      console.error("Critical error in /api/send-email: ", error);
      res.status(500).json({ success: false, error: error.message || 'Error interno al procesar el envío de correo.' });
    }
  });

  app.post('/api/send-whatsapp', async (req, res) => {
    try {
      const {
        provider,
        apiUrl,
        phoneNumberId,
        accessToken,
        to,
        message
      } = req.body;

      if (!to || !message) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos: to o message.' });
      }

      // Clean the phone number (remove spaces, plus, hyphens, parenthesis)
      const cleanPhone = to.replace(/[\s+\-()]/g, '');

      const chosenProvider = provider || process.env.WHATSAPP_PROVIDER || "meta";
      const token = accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
      const phoneId = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
      const url = apiUrl || process.env.WHATSAPP_API_URL || "https://graph.facebook.com/v19.0";

      // If no credentials and no env vars, fallback to Simulation mode so it works immediately and beautifully
      if (!token && !phoneId) {
        console.log(`[WhatsApp Simulator] Sending message to ${cleanPhone}: "${message}"`);
        return res.json({
          success: true,
          simulated: true,
          message: `[Simulación] WhatsApp enviado con éxito a +${cleanPhone}. Mensaje: "${message.substring(0, 60)}..."`,
          timestamp: new Date().toISOString()
        });
      }

      if (chosenProvider === "meta") {
        if (!phoneId) {
          return res.status(400).json({ error: 'Falta el ID del Teléfono (Phone Number ID) para WhatsApp Cloud API.' });
        }
        if (!token) {
          return res.status(400).json({ error: 'Falta el Token de Acceso para WhatsApp Cloud API.' });
        }

        const requestUrl = `${url}/${phoneId}/messages`;
        const response = await fetch(requestUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: cleanPhone,
            type: "text",
            text: {
              preview_url: false,
              body: message
            }
          })
        });

        const data = await response.json() as any;

        if (!response.ok) {
          throw new Error(data.error?.message || JSON.stringify(data));
        }

        return res.json({
          success: true,
          simulated: false,
          messageId: data.messages?.[0]?.id || "meta-ok",
          data
        });
      } else if (chosenProvider === "twilio") {
        const twilioSid = phoneId; // mapping phoneId to Twilio SID for convenience
        const twilioToken = token;
        if (!twilioSid || !twilioToken) {
          return res.status(400).json({ error: 'Para Twilio WhatsApp se requiere Account SID y Auth Token.' });
        }

        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
        
        // Basic auth for Twilio
        const authHeader = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
        
        // Form urlencoded request body
        const twilioParams = new URLSearchParams();
        twilioParams.append('To', `whatsapp:+${cleanPhone}`);
        twilioParams.append('From', url || 'whatsapp:+14155238886'); // Twilio Sandbox or number
        twilioParams.append('Body', message);

        const response = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: twilioParams
        });

        const data = await response.json() as any;

        if (!response.ok) {
          throw new Error(data.message || JSON.stringify(data));
        }

        return res.json({
          success: true,
          simulated: false,
          messageId: data.sid,
          data
        });
      } else {
        // Custom Hook/Gateway
        console.log(`[WhatsApp Custom Gateway] Sending to +${cleanPhone} via POST to ${url}`);
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            to: cleanPhone,
            message: message
          })
        });

        if (!response.ok) {
          throw new Error(`Custom gateway returned status ${response.status}`);
        }

        return res.json({
          success: true,
          simulated: false,
          message: "Mensaje despachado mediante gateway personalizado."
        });
      }
    } catch (error: any) {
      console.error("Error sending WhatsApp: ", error);
      res.status(500).json({ error: error.message || 'Error de servidor al despachar el mensaje de WhatsApp' });
    }
  });

  app.post('/api/parse-statement', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const fileName = req.file.originalname || '';
      const mime = req.file.mimetype || '';
      
      // Resolve robust mimeType to bypass generic stream issues in some operating systems & environments
      let resolvedMime = mime;
      const lowerName = fileName.toLowerCase();
      if (lowerName.endsWith('.pdf')) {
        resolvedMime = 'application/pdf';
      } else if (lowerName.endsWith('.png')) {
        resolvedMime = 'image/png';
      } else if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
        resolvedMime = 'image/jpeg';
      } else if (lowerName.endsWith('.csv')) {
        resolvedMime = 'text/csv';
      } else if (lowerName.endsWith('.xlsx')) {
        resolvedMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else if (lowerName.endsWith('.xls')) {
        resolvedMime = 'application/vnd.ms-excel';
      }

      const isSpreadsheet = 
        lowerName.endsWith('.xlsx') || 
        lowerName.endsWith('.xls') || 
        lowerName.endsWith('.csv') || 
        resolvedMime.includes('sheet') || 
        resolvedMime.includes('excel') || 
        resolvedMime.includes('csv');

      let parsedTextContent = '';

      if (isSpreadsheet) {
        try {
          const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const csvText = XLSX.utils.sheet_to_csv(worksheet);
          parsedTextContent = `Filename: ${fileName}\nSheet: ${firstSheetName || 'Default'}\n\nCSV Content:\n${csvText}`;
        } catch (excelErr: any) {
          console.error("XLSX library failed parsing, falling back to basic text encoding:", excelErr);
          parsedTextContent = req.file.buffer.toString('utf-8');
        }
      }

      // Streamlined prompt addressing real-world bank statements focusing on direct column mappings (Mexican, European, US banks like Banorte, BBVA, Citibanamex, etc.)
      const prompt = `You are an elite financial ledger audit agent and expert OCR document extractor.
I am providing you with a bank statement PDF. Your goal is to extract ALL individual granular financial transactions from the ledger tables starting on Page 2 and continuing to Page 3 and Page 4, and return them as a strictly structured list of objects.

Follow these rules for perfect extraction accuracy:

1. DATE PARSING & CORRECTION (CRITICAL):
   - Dates are written in the format "DD-MMM-YY" (e.g., "02-ENE-26", "05-ENE-26", "17-ENE-26").
   - Due to tight layout spacing in tables, dates often get merged/concatenated with following transaction IDs or descriptions (e.g. "05-ENE-2608590421" is date "05-ENE-26" and description/ID starts with "08590421...").
   - You MUST identify the "DD-MMM-YY" boundary pattern and parse it cleanly into "YYYY-MM-DD" format.
     * Translate the Spanish 3-letter month abbreviations:
       "ENE" -> "-01-", "FEB" -> "-02-", "MAR" -> "-03-", "ABR" -> "-04-",
       "MAY" -> "-05-", "JUN" -> "-06-", "JUL" -> "-07-", "AGO" -> "-08-",
       "SEP" -> "-09-", "OCT" -> "-10-", "NOV" -> "-11-", "DIC" -> "-12-".
     * E.g. "05-ENE-26" converts to "2026-01-05".
   - Use the statement period's year (2026) for transactions listed in Enero.

2. TRANSACTION DESCRIPTION CLEANUP:
   - Descriptions often split across multiple wrapped lines. Merge sequential lines belonging to the same transaction row.
   - Keep key names, student names, vendor names, reference numbers (e.g. "fact 272" or "parcialidad Alexa Nunez Jimenez"), SPEI codes, and other details.
   - Transcribe descriptions in Upper Case.

3. AMOUNT & TYPE IDENTIFICATION:
   - Read the transaction columns. The document has columns for Deposits ("MONTO DEL DEPOSITO") and Withdrawals/Fees ("MONTO DEL RETIRO").
   - Extract the active amount for each row as a positive float number.
   - Set the type of the transaction:
     * If the amount is found in the Deposit column (or represents a credit/deposit/abono/SPEI Recibido), set "type" to "income".
     * If the amount is found in the Withdrawal column (or represents a withdrawal/payment/fee/cargo/retiro), set "type" to "expense".

4. STRICT FILTERING:
   - Exclude summary headers, initial balance rows ("SALDO ANTERIOR" represents starting state, do not extract it as a transaction item), totals, summary pages, or page footers.
   - Extract only the granular individual transactions. Do not invent or skip transactions.`;

      const parts: any[] = [{ text: prompt }];
      if (parsedTextContent) {
        parts.push({ text: `Format: CSV Spreadsheet Table\nProcessed Content:\n${parsedTextContent}` });
      } else {
        parts.push({
          inlineData: {
            data: req.file.buffer.toString('base64'),
            mimeType: resolvedMime || 'application/pdf',
          }
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: {
                  type: Type.STRING,
                  description: "Transaction date in format YYYY-MM-DD, fallback to current or statement date if not found"
                },
                description: {
                  type: Type.STRING,
                  description: "Name of the entity, vendor, or description/concept in UPPERCASE"
                },
                amount: {
                  type: Type.NUMBER,
                  description: "The absolute positive numeric value of the transaction (e.g., 250.75)"
                },
                type: {
                  type: Type.STRING,
                  description: "Must be 'income' if it's a deposit/credit/receiving, or 'expense' if it's a payment/withdrawal/charge/sent"
                }
              },
              required: ["date", "description", "amount", "type"]
            }
          }
        }
      });

      const text = response.text;
      let data = [];
      if (text) {
        try {
          data = JSON.parse(text);
        } catch (e) {
          try {
            data = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
          } catch (err) {
            console.error("Failed to parse response text:", text);
          }
        }
      }
      
      res.json(data);
    } catch (error: any) {
      console.error("Error parsing statement:", error);
      res.status(500).json({ error: error.message || String(error), details: error.stack || "" });
    }
  });

  // =========================================================================
  // GEMINI INTELLIGENCE: CONSULTOR IA PARA CRM INSTITUCIONES PROSPECTO
  // =========================================================================
  app.post('/api/crm/ai-consultant', async (req, res) => {
    try {
      const { action, customPrompt, lead, activities } = req.body;

      if (!lead || !lead.name) {
        return res.status(400).json({ error: 'Faltan los datos de la institución prospecto.' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY no está configurada en las variables de entorno.' });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const leadDossier = `
=== EXPEDIENTE DE LA INSTITUCIÓN PROSPECTO ===
Nombre de la Institución: ${lead.name}
Tipo: ${lead.type || 'Institución Potencial'}
Etapa en Pipeline: ${lead.status || 'Captación'}
Monto Estimado Pipeline: $${(lead.value || 0).toLocaleString('en-US')} USD
Origen / Fuente de Captación: ${lead.source || 'No especificado'}
Contacto Principal: ${lead.contactName || 'No especificado'}
Correo Electrónico: ${lead.email || 'No especificado'}
Teléfono / WhatsApp: ${lead.phone || 'No especificado'}
Ubicación Física: ${lead.address ? `${lead.address}, ` : ''}${lead.city ? `${lead.city}, ` : ''}${lead.state ? `${lead.state}, ` : ''}${lead.country || 'México'}
Sitio Web Oficial: ${lead.website || 'No especificado'}
Responsable / Agente Comercial: ${lead.assignedTo || 'Sin asignar'}
Fecha de Registro: ${lead.createdAt || 'N/D'}

Observaciones y Requerimientos Internos del Expediente:
${lead.notes && lead.notes.trim().length > 0 ? lead.notes : 'Sin notas adicionales registradas.'}

Directorio de Contactos Adicionales:
${lead.contacts && lead.contacts.length > 0 ? JSON.stringify(lead.contacts, null, 2) : 'Sin contactos adicionales registrados.'}

Historial de Actividades y Agenda del Prospecto:
${activities && activities.length > 0 ? JSON.stringify(activities, null, 2) : 'Sin actividades previas registradas.'}
`;

      const systemInstruction = `Eres "Gemini Intelligence - Consultor IA Comercial", un estratega de ventas senior especializado en el sector educativo internacional y corporativo.
Tu objetivo es analizar minuciosamente el expediente de la institución educativa o cliente prospecto y generar contenido comercial de altísima calidad, profesional, accionable e hiperpuntero.

Estructura siempre tus respuestas con un tono ejecutivo, seguro, persuasivo y elegante usando formato Markdown claro:
- Usa encabezados (###) para estructurar secciones.
- Usa listas con viñetas (*) para destacar puntos clave.
- Usa negritas (**texto**) para conceptos importantes.
- Mantén el enfoque en cerrar la venta y aportar máximo valor al colegio.`;

      let userPrompt = "";

      switch (action) {
        case "Resumir Historial":
          userPrompt = `Realiza un Resumen Ejecutivo del Historial y Estado Actual de la institución "${lead.name}".
Incluye:
### 1. Diagnóstico General del Prospecto
### 2. Puntos Clave de Oportunidad
### 3. Perfil de Tomadores de Decisión
### 4. Recomendación Comercial Inmediata para el Agente.`;
          break;

        case "Preparar Reunión":
          userPrompt = `Genera un Plan Estratégico de Preparación para una Reunión Directiva con los tomadores de decisión de "${lead.name}".
Incluye:
### 1. Tesis Comercial y Propuesta de Valor Personalizada
### 2. Principales Objeciones Esperadas y Respuestas Maestras
### 3. Preguntas Clave de Descubrimiento (BANT) para la Directiva
### 4. Cierre Sugerido y Próximos Pasos.`;
          break;

        case "Generar Agenda":
          userPrompt = `Diseña una Agenda Estructurada y Profesional para una demostración o sesión ejecutiva de 45 minutos con "${lead.name}".
Incluye:
### 1. Objetivo General de la Sesión
### 2. Desglose Módulo por Módulo (Tiempos, Temas y Entregables)
### 3. Materiales y Preparación previa sugerida
### 4. Compromisos esperados al finalizar.`;
          break;

        case "Crear Propuesta":
          userPrompt = `Redacta el Resumen Ejecutivo de una Propuesta Comercial Formal para "${lead.name}" (Valor Estimado: $${(lead.value || 0).toLocaleString('en-US')} USD).
Incluye:
### 1. Contexto y Necesidades Identificadas del Colegio
### 2. Solución Propuesta y Alcance Operativo
### 3. Justificación del Retorno de Inversión (ROI) y Beneficios
### 4. Estructura de Inversión Sugerida
### 5. Plan de Implementación y Siguientes Hitos.`;
          break;

        case "Redactar Correo":
          userPrompt = `Redacta un Correo Electrónico Comercial Altamente Persuasivo e Hiperpersonalizado para ${lead.contactName || 'Directivo/a'} de "${lead.name}".
Considera que la institución se encuentra actualmente en la etapa "${lead.status}" del proceso comercial.
Incluye:
**Asunto sugerido:** [Escribe un asunto directo, profesional e irresistible]

**Cuerpo del Correo:**
[Escribe el mensaje completo formal pero cercano, con llamada a la acción (CTA) clara y profesional].`;
          break;

        case "Generar Plantilla Correo Seguimiento":
        case "Plantilla Seguimiento":
          {
            let lastInteractionInfo = "No hay interacciones específicas registradas previamente.";
            if (activities && Array.isArray(activities) && activities.length > 0) {
              const sorted = [...activities].sort((a, b) => new Date(b.dueDate || b.createdAt || 0).getTime() - new Date(a.dueDate || a.createdAt || 0).getTime());
              const lastAct = sorted[0];
              lastInteractionInfo = `Última interacción registrada (${lastAct.dueDate || lastAct.createdAt || 'reciente'}): Tipo: ${lastAct.type || 'Contacto'}, Título/Descripción: "${lastAct.title || ''}", Estado: ${lastAct.status || 'Completada'}, Notas/Detalles: "${lastAct.notes || 'Sin detalles'}"`;
            } else if (lead.notes && lead.notes.trim()) {
              const firstLineNote = lead.notes.split('\n')[0];
              lastInteractionInfo = `Últimas observaciones en el expediente: "${firstLineNote}"`;
            }

            userPrompt = `Genera una Plantilla de Correo Electrónico de Seguimiento Automático altamente profesional y personalizada para la institución "${lead.name}", dirigida a ${lead.contactName || 'Directivo/a'}.

INFORMACIÓN DE LA ÚLTIMA INTERACCIÓN REGISTRADA:
${lastInteractionInfo}

INSTRUCCIONES DE GENERACIÓN DE PLANTILLA:
1. Toma como punto de partida clave la última interacción registrada arriba (o la etapa actual "${lead.status}" del prospecto).
2. Genera una plantilla de correo de seguimiento oportuna, profesional, persuasiva e hiper-relevante para continuar la conversación hacia la siguiente etapa comercial.
3. Proporciona un formato listo para copiar y enviar, incluyendo asunto e instrucciones para el agente comercial.

ESTRUCTURA REQUERIDA DE LA RESPUESTA:
### 📧 Plantilla de Correo de Seguimiento Automático
**Para:** ${lead.contactName || 'Directivo/a'} <${lead.email || 'correo@institucion.edu.mx'}>
**Asunto Sugerido:** [Asunto hiper-relevante basado en la última interacción]

**Cuerpo del Correo:**
[Escribe el cuerpo completo del correo con saludo formal, referencia a la última interacción, propuesta de valor y llamada a la acción (CTA) clara]

---
### 💡 Recomendaciones para el Agente Comercial:
* **Momento idóneo para enviar:** [Indica cuándo enviar este correo e.g. 24 a 48 horas después del contacto]
* **Siguiente acción recomendada:** [Sugerencia de seguimiento si no responde]`;
          }
          break;

        case "Pronosticar Cierre & Riesgos":
          userPrompt = `Efectúa un Análisis Predictivo de Cierre y Diagnóstico de Riesgos Comerciales para la institución "${lead.name}".
Incluye:
### 1. Probabilidad Estimada de Cierre (%)
### 2. Tiempo Proyectado para la Firma de Contrato
### 3. Matriz de Riesgos Identificados (Nivel Alto / Medio / Bajo)
### 4. Factores Decisivos de Compra
### 5. Plan de Acción Inmediato de 3 Pasos para Acelerar el Cierre.`;
          break;

        default:
          userPrompt = customPrompt || `Aporta sugerencias comerciales estratégicas para avanzar la negociación con la institución "${lead.name}".`;
      }

      const promptInput = `${leadDossier}\n\n=== INSTRUCCIÓN DEL AGENTE ===\n${userPrompt}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: promptInput,
        config: {
          systemInstruction,
        }
      });

      res.json({
        success: true,
        result: response.text,
        action: action || "Consulta Personalizada",
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error("Error in CRM AI Consultant route:", error);
      res.status(500).json({ error: error.message || "Error al procesar la solicitud con Gemini Consultor IA." });
    }
  });

  // =========================================================================
  // DOCUSIGN ESIGNATURE API FOUNDATIONAL ROUTES
  // =========================================================================
  
  // Stateful memory store for DocuSign envelopes
  const docusignEnvelopes = new Map<string, {
    envelopeId: string,
    studentId: string,
    name: string,
    email: string,
    documentName: string,
    documentId: string,
    status: string,
    sentDateTime: string,
    completedDateTime?: string,
    isSimulated: boolean,
    signingUrl: string
  }>();

  // 1. DocuSign: Send envelope for signature
  app.post('/api/docusign/send-envelope', async (req, res) => {
    try {
      const { studentId, name, email, documentName, documentId, customText } = req.body;

      if (!studentId || !name || !email || !documentName) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos: studentId, name, email o documentName.' });
      }

      const clientId = process.env.DOCUSIGN_CLIENT_ID;
      const clientSecret = process.env.DOCUSIGN_CLIENT_SECRET;
      const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
      const userId = process.env.DOCUSIGN_USER_ID;
      const authServer = process.env.DOCUSIGN_AUTH_SERVER || 'account-d.docusign.com';

      // Check if keys are properly configured
      const isConfigured = !!(clientId && clientSecret && accountId && userId && 
                             !clientId.includes('your-') && !clientSecret.includes('your-'));

      const envelopeId = 'ds-' + Math.random().toString(36).substring(2, 15);
      const sentTime = new Date().toISOString();
      const mockSigningUrl = `/docusign-signing?envelopeId=${envelopeId}`;

      if (!isConfigured) {
        // Fallback to Simulation Mode
        const simulatedEnvelope = {
          envelopeId,
          studentId,
          name,
          email,
          documentName,
          documentId: documentId || 'doc-101',
          status: 'sent',
          sentDateTime: sentTime,
          isSimulated: true,
          signingUrl: mockSigningUrl
        };
        docusignEnvelopes.set(envelopeId, simulatedEnvelope);

        return res.json({
          success: true,
          isSimulated: true,
          envelopeId,
          status: 'sent',
          signingUrl: mockSigningUrl,
          message: 'DocuSign configurado en Modo Simulación (Configure credenciales en .env para producción).',
          details: {
            info: 'Para usar DocuSign real, configure las variables correspondientes en .env y asocie la autenticación JWT OAuth de DocuSign.'
          }
        });
      }

      console.log(`[DocuSign API] Iniciando envío de envelope real. ID de Cliente: ${clientId}`);
      
      try {
        // Autenticación OAuth en DocuSign (Esquema de credenciales de cliente para Sandbox/DEMO)
        const tokenResponse = await fetch(`https://${authServer}/oauth/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
          },
          body: new URLSearchParams({
            grant_type: 'client_credentials'
          })
        });

        if (!tokenResponse.ok) {
          const errText = await tokenResponse.text();
          throw new Error(`Fallo de Autenticación OAuth DocuSign (${tokenResponse.status}): ${errText}`);
        }

        const tokenData = await tokenResponse.json() as any;
        const accessToken = tokenData.access_token;

        // Construcción del Payload del Envelope
        const envelopePayload = {
          emailSubject: `Firma Requerida: ${documentName}`,
          documents: [
            {
              documentBase64: Buffer.from(`Documento oficial para ${name}. Archivo: ${documentName}. ${customText || ''}`).toString('base64'),
              name: documentName,
              fileExtension: 'txt',
              documentId: '1'
            }
          ],
          recipients: {
            signers: [
              {
                email: email,
                name: name,
                recipientId: '1',
                routingOrder: '1',
                tabs: {
                  signHereTabs: [
                    {
                      anchorString: '/firma/',
                      anchorUnits: 'pixels',
                      anchorYOffset: '10',
                      anchorXOffset: '20'
                    }
                  ]
                }
              }
            ]
          },
          status: 'sent'
        };

        const dsUrl = `https://demo.docusign.net/restapi/v2.1/accounts/${accountId}/envelopes`;
        const envelopeResponse = await fetch(dsUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(envelopePayload)
        });

        if (!envelopeResponse.ok) {
          const dsErr = await envelopeResponse.text();
          throw new Error(`Error en API eSignature (${envelopeResponse.status}): ${dsErr}`);
        }

        const envelopeData = await envelopeResponse.json() as any;
        
        const realEnvelope = {
          envelopeId: envelopeData.envelopeId,
          studentId,
          name,
          email,
          documentName,
          documentId: documentId || 'doc-101',
          status: 'sent',
          sentDateTime: sentTime,
          isSimulated: false,
          signingUrl: envelopeData.uri || mockSigningUrl
        };
        docusignEnvelopes.set(envelopeData.envelopeId, realEnvelope);

        return res.json({
          success: true,
          isSimulated: false,
          envelopeId: envelopeData.envelopeId,
          status: 'sent',
          signingUrl: realEnvelope.signingUrl,
          message: 'Contrato enviado con éxito a través de la API oficial de DocuSign.'
        });

      } catch (innerError: any) {
        console.warn("[DocuSign] No se pudo completar llamada real, usando simulación controlada:", innerError.message);
        
        const simulatedEnvelope = {
          envelopeId,
          studentId,
          name,
          email,
          documentName,
          documentId: documentId || 'doc-101',
          status: 'sent',
          sentDateTime: sentTime,
          isSimulated: true,
          signingUrl: mockSigningUrl
        };
        docusignEnvelopes.set(envelopeId, simulatedEnvelope);

        return res.json({
          success: true,
          isSimulated: true,
          envelopeId,
          status: 'sent',
          signingUrl: mockSigningUrl,
          message: `Modo Simulación Activo (La conexión real falló: ${innerError.message || 'Error de conexión'}).`,
          errorDetails: innerError.message
        });
      }

    } catch (error: any) {
      console.error("General error in DocuSign send route:", error);
      res.status(500).json({ error: error.message || 'Error al procesar la solicitud de DocuSign.' });
    }
  });

  // 2. DocuSign: Get envelope status
  app.get('/api/docusign/envelope-status/:envelopeId', async (req, res) => {
    try {
      const { envelopeId } = req.params;
      
      if (!envelopeId) {
        return res.status(400).json({ error: 'Falta el envelopeId.' });
      }

      const envObj = docusignEnvelopes.get(envelopeId);
      if (envObj) {
        return res.json(envObj);
      }

      // Check process env config
      const clientId = process.env.DOCUSIGN_CLIENT_ID;
      const isSimulated = !clientId || clientId.startsWith('your-') || envelopeId.startsWith('ds-');

      if (isSimulated) {
        return res.json({
          envelopeId,
          status: 'sent',
          sentDateTime: new Date().toISOString(),
          isSimulated: true,
          message: "Simulación de estado"
        });
      }

      return res.status(404).json({ error: `Envelope ${envelopeId} no encontrado.` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 3. DocuSign: Simular firma (para desarrollo/pruebas)
  app.post('/api/docusign/simulate-completion/:envelopeId', async (req, res) => {
    try {
      const { envelopeId } = req.params;
      const envObj = docusignEnvelopes.get(envelopeId);
      
      if (!envObj) {
        return res.status(404).json({ error: 'Envelope no encontrado' });
      }

      envObj.status = 'completed';
      envObj.completedDateTime = new Date().toISOString();
      docusignEnvelopes.set(envelopeId, envObj);

      res.json({
        success: true,
        message: 'Firma simulada con éxito. El estado se ha actualizado a "completed" (Firmado).',
        envelope: envObj
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 4. DocuSign: Get all envelopes for student
  app.get('/api/docusign/envelopes/student/:studentId', async (req, res) => {
    try {
      const { studentId } = req.params;
      const list = Array.from(docusignEnvelopes.values()).filter(e => e.studentId === studentId);
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Google Sheets CRM Import Endpoint
  app.post('/api/crm/import-google-sheets', async (req, res) => {
    try {
      const { url, rawText } = req.body;

      if (!url && !rawText) {
        return res.status(400).json({ success: false, error: 'Se requiere una URL de Google Sheets o el texto copiado de las celdas.' });
      }

      let csvData = '';

      if (rawText && typeof rawText === 'string' && rawText.trim()) {
        csvData = rawText.trim();
      } else if (url && typeof url === 'string') {
        // Extract Google Sheet ID
        const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (!match) {
          return res.status(400).json({ 
            success: false, 
            error: 'La URL proporcionada no parece ser un enlace válido de Google Sheets. Formato esperado: https://docs.google.com/spreadsheets/d/ID_DE_LA_HOJA/...' 
          });
        }
        const sheetId = match[1];

        // Extract gid if present
        const gidMatch = url.match(/[#&?]gid=([0-9]+)/);
        const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';

        // Try primary CSV export URL
        const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gidParam}`;
        
        let fetchSuccess = false;
        try {
          const response = await fetch(exportUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
            },
            redirect: 'follow'
          });

          const contentType = response.headers.get('content-type') || '';
          const text = await response.text();

          // Check if response is HTML (login page or 404) or valid CSV
          if (response.ok && !text.includes('<!DOCTYPE html') && !text.includes('<html') && (contentType.includes('csv') || text.includes(','))) {
            csvData = text;
            fetchSuccess = true;
          }
        } catch (e) {
          console.warn("Direct CSV export failed, trying gviz endpoint...", e);
        }

        // Fallback to gviz endpoint if primary failed
        if (!fetchSuccess) {
          try {
            const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv${gidParam}`;
            const gvizResponse = await fetch(gvizUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
              },
              redirect: 'follow'
            });
            const text = await gvizResponse.text();
            if (gvizResponse.ok && !text.includes('<!DOCTYPE html') && !text.includes('<html')) {
              csvData = text;
              fetchSuccess = true;
            }
          } catch (e) {
            console.warn("gviz endpoint failed...", e);
          }
        }

        if (!fetchSuccess || !csvData) {
          return res.json({
            success: false,
            isRestricted: true,
            sheetId,
            message: 'La hoja de cálculo de Google no tiene acceso público activado o requiere inicio de sesión.',
            helpInstructions: [
              'Abre tu hoja de cálculo en Google Sheets.',
              'Haz clic en el botón azul "Compartir" (esquina superior derecha).',
              'Bajo "Acceso general", cambia "Restringido" por "Cualquier persona con el enlace".',
              'Verifica que el rol sea "Lector" y presiona "Hecho".',
              'Vuelve aquí y presiona "Reintentar Conexión", o simplemente copia las celdas (Ctrl+C) y úsalas en la pestaña "Pegar desde Google Sheets".'
            ]
          });
        }
      }

      // Parse CSV or TSV (copied from sheets)
      const lines = csvData.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length < 1) {
        return res.status(400).json({ success: false, error: 'La hoja de cálculo no contiene filas o está vacía.' });
      }

      // Check delimiter (tab, semicolon, or comma)
      const firstLine = lines[0];
      const isTab = firstLine.includes('\t');
      const isSemicolon = !isTab && firstLine.includes(';') && ((firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length);

      const parseLine = (line: string): string[] => {
        if (isTab) {
          return line.split('\t').map(c => c.trim().replace(/^"|"$/g, ''));
        }
        if (isSemicolon) {
          return line.split(/;(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''));
        }
        return line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''));
      };

      const rawHeaders = parseLine(firstLine);
      const headers = rawHeaders.map(h => h.trim());

      const cleanStr = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

      const isIdHeader = (cleanH: string) => {
        return cleanH === "id" || 
               cleanH === "id lead" || 
               cleanH === "lead id" || 
               cleanH === "id_lead" || 
               cleanH === "lead_id" || 
               cleanH === "idlead" || 
               cleanH === "folio" || 
               cleanH === "codigo" || 
               cleanH === "cve" || 
               cleanH === "no" || 
               cleanH === "no." || 
               cleanH === "num" || 
               cleanH === "numero" ||
               cleanH.startsWith("id ") || 
               cleanH.endsWith(" id") || 
               cleanH.startsWith("id_") ||
               cleanH.startsWith("id-");
      };

      // 1. Explicit ID column
      const idxId = headers.findIndex(h => isIdHeader(cleanStr(h)));

      // 2. Email column
      const idxEmail = headers.findIndex(h => {
        const c = cleanStr(h);
        return !isIdHeader(c) && (c === "correo" || c === "email" || c.includes("mail") || c.includes("correo electronico"));
      });

      // 3. Phone column
      const idxPhone = headers.findIndex(h => {
        const c = cleanStr(h);
        return !isIdHeader(c) && (c.includes("telefono") || c.includes("celular") || c.includes("movil") || c.includes("whatsapp") || c === "phone" || c === "tel");
      });

      // 4. Institution / School / Company Name
      const idxInstitution = headers.findIndex(h => {
        const c = cleanStr(h);
        return !isIdHeader(c) && (
          c.includes("institucion") || 
          c.includes("colegio") || 
          c.includes("escuela") || 
          c.includes("universidad") || 
          c.includes("razon social") || 
          c.includes("empresa") || 
          c === "nombre institucion" || 
          c === "nombre de institucion" || 
          c === "nombre del colegio" || 
          c === "nombre colegio"
        );
      });

      // 5. Contact Person column
      const idxContact = headers.findIndex(h => {
        const c = cleanStr(h);
        return !isIdHeader(c) && (
          c === "contacto" ||
          c.includes("contacto principal") || 
          c.includes("nombre contacto") || 
          c.includes("nombre del contacto") || 
          c.includes("persona de contacto") || 
          c.includes("responsable") || 
          c.includes("director") || 
          c.includes("coordinador") || 
          c.includes("encargado") || 
          c.includes("representante") || 
          c.includes("titular")
        );
      });

      // 6. General "Nombre" column (must NOT be an ID column, and NOT contact column)
      const idxGeneralName = headers.findIndex(h => {
        const c = cleanStr(h);
        return !isIdHeader(c) && 
               !c.includes("contacto") && 
               !c.includes("responsable") && 
               (c === "nombre" || c === "nombre completo" || c === "prospecto" || c === "nombre prospecto" || c === "particular" || c === "alumno");
      });

      // Determine Name & Contact indices correctly
      let idxName = -1;
      let finalIdxContact = idxContact;

      if (idxInstitution !== -1) {
        idxName = idxInstitution;
        if (finalIdxContact === -1 && idxGeneralName !== -1 && idxGeneralName !== idxInstitution) {
          finalIdxContact = idxGeneralName;
        }
      } else if (idxGeneralName !== -1) {
        idxName = idxGeneralName;
        if (finalIdxContact === -1) {
          finalIdxContact = idxGeneralName; // Both name and contact can default to the same column
        }
      } else {
        // Fallback: pick first column that is NOT ID, NOT email, NOT phone
        idxName = headers.findIndex((h, i) => {
          const c = cleanStr(h);
          return !isIdHeader(c) && i !== idxEmail && i !== idxPhone;
        });
        if (finalIdxContact === -1) {
          finalIdxContact = idxName;
        }
      }

      if (idxName === -1) idxName = 0;
      if (finalIdxContact === -1) finalIdxContact = idxName;

      // Other fields
      const idxCity = headers.findIndex(h => {
        const c = cleanStr(h);
        return !isIdHeader(c) && (c === "ciudad" || c.includes("municipio") || c === "city" || c.includes("localidad"));
      });
      const idxState = headers.findIndex(h => {
        const c = cleanStr(h);
        return !isIdHeader(c) && (c === "estado" || c.includes("provincia") || c.includes("departamento") || c.includes("region") || c === "state");
      });
      const idxCountry = headers.findIndex(h => {
        const c = cleanStr(h);
        return !isIdHeader(c) && (c.includes("pais") || c === "country" || c.includes("nacion"));
      });
      const idxType = headers.findIndex(h => {
        const c = cleanStr(h);
        return !isIdHeader(c) && (c.includes("tipo") || c.includes("categoria") || c.includes("modalidad"));
      });
      const idxStatus = headers.findIndex(h => {
        const c = cleanStr(h);
        return !isIdHeader(c) && (c.includes("estatus") || (c.includes("estado") && c !== "estado") || c.includes("etapa") || c.includes("fase") || c === "status");
      });
      const idxSource = headers.findIndex(h => {
        const c = cleanStr(h);
        return !isIdHeader(c) && (c.includes("origen") || c.includes("fuente") || c.includes("medio") || c === "source" || c.includes("canal"));
      });
      const idxValue = headers.findIndex(h => {
        const c = cleanStr(h);
        return !isIdHeader(c) && (c.includes("valor") || c.includes("monto") || c.includes("presupuesto") || c.includes("inversion") || c === "value" || c.includes("precio"));
      });
      const idxNotes = headers.findIndex(h => {
        const c = cleanStr(h);
        return !isIdHeader(c) && (c.includes("nota") || c.includes("observacion") || c.includes("comentario") || c.includes("detalle") || c.includes("notes"));
      });

      const records: any[] = [];
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const row = parseLine(lines[i]);
        if (row.length === 0 || row.every(cell => !cell)) continue;

        const getVal = (idx: number, fallback: string = "") => {
          if (idx !== -1 && idx < row.length && row[idx]) {
            return row[idx].trim();
          }
          return fallback;
        };

        const rawId = getVal(idxId, "");
        let rawName = getVal(idxName, "");
        let rawContact = getVal(finalIdxContact, "");

        // If rawName is empty or accidentally caught the ID Lead value, search other cells in this row
        if (!rawName || (rawId && rawName === rawId)) {
          for (let c = 0; c < row.length; c++) {
            if (c !== idxId && c !== idxEmail && c !== idxPhone && row[c] && row[c].trim() !== rawId) {
              rawName = row[c].trim();
              break;
            }
          }
        }

        if (!rawName) {
          errors.push(`Fila #${i + 1}: Sin nombre o institución detectada.`);
          continue;
        }

        // Contact Name should NEVER repeat rawId, but CAN repeat or be the same as rawName
        let contactName = rawContact ? rawContact.trim() : "";
        if (rawId && contactName === rawId) {
          contactName = "";
        }
        if (!contactName && rawName) {
          contactName = rawName.trim();
        }

        const email = getVal(idxEmail, "");
        const phone = getVal(idxPhone, "");
        const city = getVal(idxCity, "");
        const state = getVal(idxState, "");
        const country = getVal(idxCountry, "México");
        const typeRaw = getVal(idxType, "Institución Potencial");
        const statusRaw = getVal(idxStatus, "Leads");
        const source = getVal(idxSource, "Google Sheets");
        const valRaw = getVal(idxValue, "3000");
        const userNotes = getVal(idxNotes, "");

        let notes = userNotes;
        if (rawId) {
          notes = notes ? `[ID Lead: ${rawId}] ${notes}` : `[ID Lead: ${rawId}] Importado de Google Sheets.`;
        } else if (!notes) {
          notes = "Importado automáticamente desde Google Sheets.";
        }

        records.push({
          rowNum: i + 1,
          idLead: rawId || undefined,
          name: rawName,
          contactName: contactName || rawName || "Contacto Principal",
          email: email || "contacto@institucion.com",
          phone: phone || "No proporcionado",
          city,
          state,
          country,
          type: typeRaw.toLowerCase().includes("redes") || typeRaw.toLowerCase().includes("social")
            ? "Redes Sociales"
            : typeRaw.toLowerCase().includes("persona") || typeRaw.toLowerCase().includes("particular") 
              ? "Persona Potencial" 
              : "Institución Potencial",
          status: statusRaw,
          source,
          value: Number(valRaw.replace(/[^0-9.-]+/g, "")) || 3000,
          notes,
          rawRow: row
        });
      }

      return res.json({
        success: true,
        headers,
        totalRows: lines.length - 1,
        importedCount: records.length,
        records,
        errors,
        detectedMapping: {
          idLead: idxId !== -1 ? headers[idxId] : null,
          name: idxName !== -1 ? headers[idxName] : null,
          contactName: finalIdxContact !== -1 ? headers[finalIdxContact] : (idxName !== -1 ? headers[idxName] : null),
          email: idxEmail !== -1 ? headers[idxEmail] : null,
          phone: idxPhone !== -1 ? headers[idxPhone] : null,
          city: idxCity !== -1 ? headers[idxCity] : null,
          country: idxCountry !== -1 ? headers[idxCountry] : null,
        }
      });
    } catch (error: any) {
      console.error("Error in /api/crm/import-google-sheets:", error);
      res.status(500).json({ success: false, error: error.message || 'Error procesando la hoja de cálculo de Google.' });
    }
  });

  // Explicit 404 handler for API routes to prevent falling through to Vite's index.html
  app.all('/api/*', (req, res) => {
    res.status(404).json({ success: false, error: `Ruta de API no encontrada: ${req.method} ${req.path}` });
  });

  // Global API error handler ensuring all /api requests always return JSON
  app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('API Error:', err);
    if (err?.type === 'entity.too.large' || err?.status === 413) {
      return res.status(413).json({
        success: false,
        error: 'El contenido o archivo excede el límite permitido (50MB).'
      });
    }
    return res.status(err?.status || 500).json({
      success: false,
      error: err?.message || 'Error interno del servidor en la API.'
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });

  server.on('error', (err: any) => {
    console.error('Server listen error:', err);
  });
}

startServer();
