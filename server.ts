import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import nodemailer from 'nodemailer';

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
        subject, 
        body 
      } = req.body;

      // Ensure we have configuration from UI or server environment variables
      const host = smtpHost || process.env.SMTP_HOST;
      const port = Number(smtpPort || process.env.SMTP_PORT || 587);
      const user = smtpUser || process.env.SMTP_USER;
      const pass = smtpPass || process.env.SMTP_PASS;
      const fromEmail = smtpFromEmail || process.env.SMTP_FROM_EMAIL;
      const fromName = smtpFromName || process.env.SMTP_FROM_NAME || "IHS Sistema";

      if (!host || !user || !pass || !fromEmail) {
        return res.status(400).json({ 
          error: 'Credenciales de correo (SMTP) incompletas. Por favor configúralas en la sección de Configuración o usa las variables de entorno en el servidor.' 
        });
      }

      if (!to || !subject || !body) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos: to, subject o body.' });
      }

      // Configure nodemailer transporter
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
        }
      });

      // Send email
      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        text: body,
        html: `<div style="font-family: sans-serif; font-size: 14px; color: #334155; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #4f46e5; margin-top: 0; font-size: 18px; font-weight: 700; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px;">Notificación IHS</h2>
          <p style="white-space: pre-wrap; margin-top: 16px;">${body}</p>
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; text-align: center;">
            Este es un correo automático enviado por el sistema IHS.
          </div>
        </div>`
      });

      res.json({ success: true, messageId: info.messageId });
    } catch (error: any) {
      console.error("Error sending email: ", error);
      res.status(500).json({ error: error.message || 'Error desconocido al enviar el de correo electrónico.' });
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

      const prompt = `You are an expert financial data extractor and OCR parser. I am providing you with a bank statement file (PDF, CSV, Excel, or image).
Extract all the financial transactions present in this document. 

For each transaction, determine:
1. date (YYYY-MM-DD format, e.g. "2024-03-15")
2. description (clean up the text, preserving the vendor or description name, and convert to uppercase)
3. amount (absolute positive numeric value of the transaction, e.g. 1500.50, never negative)
4. type ('income' or 'expense' depending on whether it is an deposit/credit or withdrawal/charge/debit)

Important guidelines:
- If a transaction is an intake, deposit, credit, transfer in, yield/interest, set type as 'income'.
- If a transaction is a charge, payment, transfer out, withdraw, fee, tax, set type as 'expense'.
- Ensure amount is always a positive number (absolute value).`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
          prompt,
          {
            inlineData: {
              data: req.file.buffer.toString('base64'),
              mimeType: req.file.mimetype || 'application/pdf',
            }
          }
        ],
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
                  description: "Name of the entity, vendor, or description/concept"
                },
                amount: {
                  type: Type.NUMBER,
                  description: "The absolute positive numeric value of the transaction (e.g., 250.75)"
                },
                type: {
                  type: Type.STRING,
                  description: "Must be 'income' if it's a deposit/credit, or 'expense' if it's a payment/withdrawal/charge"
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
    } catch (error) {
      console.error("Error parsing statement:", error);
      res.status(500).json({ error: 'Failed to process document' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
