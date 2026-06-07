import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getMimeType(fileName: string): string {
  const ext = (fileName || "").split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf": return "application/pdf";
    case "docx": return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "doc": return "application/msword";
    case "txt": return "text/plain";
    default: return "application/pdf";
  }
}

// ── ZIP / DOCX extraction ──────────────────────────────────────────────
// DOCX is a ZIP archive. We locate word/document.xml inside it,
// decompress via the Web-standard DecompressionStream, then pull text
// from <w:t> tags.

async function extractDocxText(bytes: Uint8Array): Promise<string> {
  // Scan for ZIP local-file headers (PK\x03\x04) and find word/document.xml
  const target = "word/document.xml";
  let offset = 0;

  while (offset < bytes.length - 30) {
    // Local file header signature = 0x04034b50
    if (bytes[offset] === 0x50 && bytes[offset + 1] === 0x4b &&
        bytes[offset + 2] === 0x03 && bytes[offset + 3] === 0x04) {

      const compressionMethod = bytes[offset + 8] | (bytes[offset + 9] << 8);
      const compressedSize = bytes[offset + 18] | (bytes[offset + 19] << 8) |
                             (bytes[offset + 20] << 16) | (bytes[offset + 21] << 24);
      const uncompressedSize = bytes[offset + 22] | (bytes[offset + 23] << 8) |
                               (bytes[offset + 24] << 16) | (bytes[offset + 25] << 24);
      const fileNameLen = bytes[offset + 26] | (bytes[offset + 27] << 8);
      const extraLen = bytes[offset + 28] | (bytes[offset + 29] << 8);

      const fileNameBytes = bytes.slice(offset + 30, offset + 30 + fileNameLen);
      const fileName = new TextDecoder().decode(fileNameBytes);

      const dataStart = offset + 30 + fileNameLen + extraLen;

      if (fileName === target && compressedSize > 0) {
        const compressedData = bytes.slice(dataStart, dataStart + compressedSize);

        let xmlText: string;
        if (compressionMethod === 8) {
          // Deflate → use DecompressionStream
          xmlText = await decompressDeflateRaw(compressedData);
        } else if (compressionMethod === 0) {
          // Stored (no compression)
          xmlText = new TextDecoder().decode(compressedData);
        } else {
          throw new Error(`Unsupported compression method: ${compressionMethod}`);
        }

        // Extract text from <w:t> tags
        const matches = xmlText.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
        if (matches && matches.length > 0) {
          return matches.map(m => m.replace(/<[^>]+>/g, "")).join(" ");
        }
        return xmlText.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      }

      // If compressedSize is 0, might use data descriptor – skip by scanning
      if (compressedSize > 0) {
        offset = dataStart + compressedSize;
      } else {
        offset = dataStart + (uncompressedSize > 0 ? uncompressedSize : 1);
      }
    } else {
      offset++;
    }
  }

  throw new Error("word/document.xml not found in DOCX");
}

async function decompressDeflateRaw(data: Uint8Array): Promise<string> {
  const ds = new DecompressionStream("deflate-raw");
  const writer = ds.writable.getWriter();
  const reader = ds.readable.getReader();

  const writePromise = writer.write(data).then(() => writer.close());

  const chunks: Uint8Array[] = [];
  let totalLen = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    totalLen += value.length;
  }
  await writePromise;

  const result = new Uint8Array(totalLen);
  let pos = 0;
  for (const chunk of chunks) {
    result.set(chunk, pos);
    pos += chunk.length;
  }
  return new TextDecoder().decode(result);
}

// Fallback: naive text extraction from raw bytes (for broken/unusual files)
function extractDocxTextFallback(bytes: Uint8Array): string {
  const decoder = new TextDecoder("utf-8", { fatal: false });
  const rawText = decoder.decode(bytes);
  const textMatches = rawText.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
  if (textMatches && textMatches.length > 0) {
    return textMatches.map(m => m.replace(/<[^>]+>/g, "")).join(" ");
  }
  return rawText.replace(/<[^>]+>/g, " ").replace(/[^\x20-\x7E\n\r]/g, " ").replace(/\s+/g, " ").trim();
}

// ── Post-processing ────────────────────────────────────────────────────

function postProcessExtracted(data: any): any {
  // Step 0: Convert string "null"/"N/A"/etc to real null
  const nullPatterns = /^(null|undefined|\[unknown\]|n\/a|none|not available|not mentioned|unknown|-)$/i;
  for (const key of Object.keys(data)) {
    if (typeof data[key] === "string" && nullPatterns.test(data[key].trim())) {
      data[key] = null;
    }
  }

  // Fix education: if it mentions "pursuing"/"currently", try to find completed degree
  if (data.education && /currently|pursuing/i.test(data.education)) {
    if (data.qualifications && Array.isArray(data.qualifications)) {
      const completed = data.qualifications.find((q: string) =>
        !/currently|pursuing/i.test(q) && /master|msw|msc|mphil|bachelor|bsc|bsw|phd|md|diploma|gnm|ma|mba/i.test(q)
      );
      if (completed) {
        data.education = completed;
      }
    }
  }

  // Calculate total_experience_years from work_history if null
  if ((data.total_experience_years == null || data.total_experience_years === 0) && data.work_history && Array.isArray(data.work_history) && data.work_history.length > 0) {
    let totalMonths = 0;
    const now = new Date();
    for (const entry of data.work_history) {
      if (entry.from) {
        const fromDate = parseYearMonth(entry.from);
        const toDate = entry.to ? parseYearMonth(entry.to) : now;
        if (fromDate && toDate) {
          const months = (toDate.getFullYear() - fromDate.getFullYear()) * 12 + (toDate.getMonth() - fromDate.getMonth());
          if (months > 0) totalMonths += months;
        }
      }
    }
    if (totalMonths > 0) {
      data.total_experience_years = Math.round((totalMonths / 12) * 10) / 10;
    }
  }

  // Calculate psychiatry_experience_years from work_history if null
  const psyKeywords = ["psych", "mental health", "psychiatric", "rehabilitation", "rehab", "counsell", "de-addiction", "deaddiction", "substance abuse"];
  if ((data.psychiatry_experience_years == null || data.psychiatry_experience_years === 0) && data.work_history && Array.isArray(data.work_history) && data.work_history.length > 0) {
    let psyMonths = 0;
    const now = new Date();
    for (const entry of data.work_history) {
      const text = `${entry.employer || ""} ${entry.designation || ""}`.toLowerCase();
      const isPsy = psyKeywords.some(kw => text.includes(kw));
      if (isPsy && entry.from) {
        const fromDate = parseYearMonth(entry.from);
        const toDate = entry.to ? parseYearMonth(entry.to) : now;
        if (fromDate && toDate) {
          const months = (toDate.getFullYear() - fromDate.getFullYear()) * 12 + (toDate.getMonth() - fromDate.getMonth());
          if (months > 0) psyMonths += months;
        }
      }
    }
    if (psyMonths > 0) {
      data.psychiatry_experience_years = Math.round((psyMonths / 12) * 10) / 10;
    }
  }

  return data;
}

function parseYearMonth(str: string): Date | null {
  if (!str) return null;
  const match = str.match(/(\d{4})-(\d{1,2})/);
  if (match) return new Date(parseInt(match[1]), parseInt(match[2]) - 1);
  const yearMatch = str.match(/(\d{4})/);
  if (yearMatch) return new Date(parseInt(yearMatch[1]), 0);
  return null;
}

// ── Main handler ───────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileBase64, fileName } = await req.json();

    if (!fileBase64) {
      return new Response(JSON.stringify({ error: "fileBase64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a resume/CV parser for a psychiatric healthcare organization called Mindful Rejuvenation.
Extract candidate details from the provided resume. Be thorough and accurate.

CRITICAL INSTRUCTIONS:
1. For "education", extract the HIGHEST COMPLETED degree/qualification only. Do NOT include any degree that is "currently pursuing", "ongoing", or "in progress". Examples: "MSW", "BSc Nursing", "MPhil Clinical Psychology".
2. For "total_experience_years", you MUST calculate this by summing all work experience periods. Count months from start to end for each role, then convert to years (rounded to 1 decimal). If currently employed, count until today (April 2026).
3. For "psychiatry_experience_years", sum ONLY roles that involve psychiatric care, mental health, rehabilitation, de-addiction, counselling, or related clinical work.
4. For "qualifications", list ALL degrees/certifications including currently pursuing ones.
5. NEVER return the string "null", "N/A", "unknown", or "[UNKNOWN]" for any field. If you cannot determine a value, omit the field or return actual null.
6. If the candidate is from HR/Admin/Non-clinical background without clinical qualifications, classify profession_category as "Admin/Support". Do not classify as "Psychologist" just because of psychology-adjacent keywords.

Pay special attention to extracting phone numbers, email addresses, current employer, designation, languages known, education details, and any RCI/council registration numbers.

For profession_category, classify the candidate into one of these categories based on their qualifications and experience:
- Psychiatrist
- Psychologist
- Nurse
- Social Worker (PSW)
- MPhil PSW / Programme Coordinator
- Ward Incharge
- Admission Counsellor
- Rehab Coordinator
- Duty Medical Officer
- Admin/Support
- Other

For shift_readiness, classify as: day_only, night_only, rotational, or flexible based on any mentions in the resume.
For languages_known, extract all languages the candidate knows.
For clinical_exposure, extract areas like substance_abuse, geriatric, child_adolescent, forensic, rehabilitation, etc.

If you cannot determine a field, return null for that field. But TRY HARD to calculate experience years from the work history dates.`;

    const mimeType = getMimeType(fileName || "resume.pdf");
    const isTextFile = mimeType === "text/plain";
    const isDocx = mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || mimeType === "application/msword";

    let userContent: any;
    if (isTextFile) {
      const fileContent = atob(fileBase64);
      userContent = `Parse this resume and extract candidate details:\n\nFilename: ${fileName || "resume"}\n\n${fileContent}`;
    } else if (isDocx) {
      // Decode base64 to bytes
      const binaryStr = atob(fileBase64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

      let extractedText = "";
      try {
        // Proper ZIP decompression
        extractedText = await extractDocxText(bytes);
        console.log("DOCX ZIP extraction succeeded, text length:", extractedText.length);
      } catch (zipErr) {
        console.warn("DOCX ZIP extraction failed, using fallback:", zipErr);
        extractedText = extractDocxTextFallback(bytes);
        console.log("DOCX fallback extraction, text length:", extractedText.length);
      }

      if (!extractedText || extractedText.length < 20) {
        console.warn("DOCX extraction produced very little text, length:", extractedText.length);
      }

      userContent = `Parse this resume and extract candidate details:\n\nFilename: ${fileName || "resume"}\n\n${extractedText}`;
    } else {
      // PDF - send as multimodal attachment
      userContent = [
        {
          type: "text",
          text: `Parse this resume file (${fileName || "resume"}) and extract all candidate details including phone number, email, current employer, current designation, experience, education, languages, registration numbers, and other relevant information. IMPORTANT: For education, only include the highest COMPLETED degree. Calculate total_experience_years by summing all work periods.`,
        },
        {
          type: "image_url",
          image_url: {
            url: `data:${mimeType};base64,${fileBase64}`,
          },
        },
      ];
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_candidate",
                description:
                  "Extract structured candidate information from a resume/CV",
                parameters: {
                  type: "object",
                  properties: {
                    first_name: { type: "string", description: "Candidate first name" },
                    last_name: { type: "string", description: "Candidate last name" },
                    email: { type: "string", description: "Email address" },
                    phone: { type: "string", description: "Phone number including country code if available" },
                    current_city: { type: "string", description: "Current city of residence" },
                    current_designation: { type: "string", description: "Current job title/designation" },
                    current_employer: { type: "string", description: "Current employer/organization name" },
                    total_experience_years: { type: "number", description: "Total years of experience. MUST be calculated by summing all work periods from work_history. Count months between start and end dates, divide by 12." },
                    notice_period_days: { type: "number", description: "Notice period in days if mentioned" },
                    expected_ctc: { type: "number", description: "Expected CTC/salary if mentioned (annual, in INR)" },
                    current_salary: { type: "number", description: "Current salary if mentioned (annual, in INR)" },
                    profession_category: {
                      type: "string",
                      enum: [
                        "Psychiatrist", "Psychologist", "Nurse", "Social Worker (PSW)",
                        "MPhil PSW / Programme Coordinator", "Ward Incharge", "Admission Counsellor",
                        "Rehab Coordinator", "Duty Medical Officer", "Admin/Support", "Other",
                      ],
                      description: "Professional category classification",
                    },
                    qualifications: { type: "array", items: { type: "string" }, description: "List of ALL qualifications/degrees including currently pursuing" },
                    skills: { type: "array", items: { type: "string" }, description: "List of key skills" },
                    education: { type: "string", description: "HIGHEST COMPLETED degree only. Do NOT include currently pursuing degrees. Example: 'MSW', 'BSc Nursing', 'MPhil Clinical Psychology'" },
                    languages_known: { type: "array", items: { type: "string" }, description: "Languages the candidate knows" },
                    shift_readiness: {
                      type: "string",
                      enum: ["day_only", "night_only", "rotational", "flexible"],
                      description: "Shift readiness preference",
                    },
                    rci_registration: { type: "string", description: "RCI registration number if applicable" },
                    nursing_council_reg: { type: "string", description: "Nursing council registration if applicable" },
                    psychiatry_experience_years: { type: "number", description: "Years of experience specifically in psychiatry/mental health. Calculate by summing only psychiatric/mental health/rehabilitation/counselling work periods." },
                    clinical_exposure: {
                      type: "array",
                      items: { type: "string" },
                      description: "Clinical exposure areas like substance_abuse, geriatric, child_adolescent, forensic, rehabilitation",
                    },
                    past_employers: { type: "string", description: "Comma-separated list of past employers" },
                    work_history: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          employer: { type: "string", description: "Employer/organization name" },
                          designation: { type: "string", description: "Job title/role held" },
                          from: { type: "string", description: "Start date in YYYY-MM format" },
                          to: { type: "string", description: "End date in YYYY-MM format, or empty if current" },
                        },
                        required: ["employer"],
                      },
                      description: "Structured work history with employer, designation, and time periods",
                    },
                  },
                  required: ["first_name", "last_name", "profession_category"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "extract_candidate" },
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return structured data");
    }

    let extracted = JSON.parse(toolCall.function.arguments);
    
    // Post-process: fix education, calculate experience years, clean null strings
    extracted = postProcessExtracted(extracted);
    
    console.log("Extracted candidate data:", JSON.stringify(extracted));

    return new Response(JSON.stringify({ extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-resume error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
