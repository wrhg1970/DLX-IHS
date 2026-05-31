import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
